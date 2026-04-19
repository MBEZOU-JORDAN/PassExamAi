"""
Générateur d'exercices — PassExamAI
Utilise RAG uniquement (pas de web) pour garantir l'alignement avec le programme.
"""
import json
import logging
import uuid

from app.ai.llm_client import llm_complete
from app.db.supabase_client import supabase
from app.rag.retrieval import retrieve_for_chapter
from app.schemas.exercise import ExerciseSchema, MCQOption, RubricStep

logger = logging.getLogger(__name__)

# ✅ JSON valide et bien structuré
EXERCISE_SYSTEM_PROMPT = """You are an expert exam question writer.
Generate exercises for a student preparing for an exam chapter.

Output ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "exercises": [
    {
      "question_type": "mcq",
      "prompt": "string — the question",
      "options": [
        {"label": "A", "content": "string"},
        {"label": "B", "content": "string"},
        {"label": "C", "content": "string"},
        {"label": "D", "content": "string"}
      ],
      "correct_answer": "A",
      "difficulty": 2
    },
    {
      "question_type": "short_answer",
      "prompt": "string — the question",
      "expected_answer_schema": [
        {"description": "string — what to award points for", "points": 2.0}
      ],
      "difficulty": 2
    },
    {
      "question_type": "structured",
      "prompt": "string — multi-part question",
      "expected_answer_schema": [
        {"description": "Part (a): ...", "points": 3.0},
        {"description": "Part (b): ...", "points": 4.0}
      ],
      "difficulty": 3
    }
  ]
}

Rules:
- Base ALL questions strictly on the provided document content — no outside facts
- difficulty: 1=easy, 2=medium, 3=hard
- MCQ: exactly 4 options, one clearly correct answer
- short_answer / structured: include a rubric with point breakdown
- All text in English
"""


async def generate_exercises(
    chapter_id: str,
    project_id: str,
    count: int = 5,
    types: list[str] | None = None,
) -> list[ExerciseSchema]:
    """
    Génère des exercices pour un chapitre via RAG uniquement.
    Vérifie d'abord si des exercices existent en cache.

    types : liste des types souhaités — None = mix 2 MCQ / 2 short / 1 structured
    """
    if types is None:
        types = ["mcq", "mcq", "short_answer", "short_answer", "structured"]

    # ── Cache : exercices déjà générés ? ─────────────────
    existing = (
        supabase.table("exercises")
        .select("*")
        .eq("chapter_id", chapter_id)
        .limit(count)
        .execute()
    )
    if existing.data:
        logger.info(f"Cache hit exercices pour chapitre {chapter_id}")
        return _rows_to_schemas(existing.data)

    # ── Récupère le chapitre ──────────────────────────────
    chapter_result = (
        supabase.table("chapters")
        .select("title, objective")
        .eq("id", chapter_id)
        .single()
        .execute()
    )
    if not chapter_result.data:
        raise ValueError(f"Chapitre {chapter_id} introuvable")

    title = chapter_result.data["title"]
    objective = chapter_result.data.get("objective", "")

    # ── RAG uniquement ─────────────────────────────────────
    rag_chunks = await retrieve_for_chapter(
        chapter_title=title,
        project_id=project_id,
        top_k=6,
    )
    rag_context = "\n\n".join(
        f"[Chunk {i+1}]\n{c.get('content', '')[:1200]}"
        for i, c in enumerate(rag_chunks[:5])
    ) or "No document chunks available — generate based on chapter title and objective only."

    type_distribution = ", ".join(types[:count])
    user_prompt = f"""Chapter: {title}
Objective: {objective}
Generate exactly {count} exercises. Type distribution: {type_distribution}

Document content (base your questions ONLY on this):
{rag_context}
"""

    messages = [
        {"role": "system", "content": EXERCISE_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    raw = await llm_complete(
        messages=messages,
        task="exercise",
        max_tokens=2500,
        response_format={"type": "json_object"},
    )

    exercises = _parse_exercises(raw, chapter_id)
    saved = _save_exercises(exercises, chapter_id)
    logger.info(f"✅ {len(saved)} exercices générés pour chapitre {chapter_id}")
    return saved


# ─────────────────────────────────────────────
# Helpers privés
# ─────────────────────────────────────────────

def _parse_exercises(raw: str, chapter_id: str) -> list[ExerciseSchema]:
    try:
        data = json.loads(raw)
        # Normalise : accepte {"exercises": [...]} ou directement [...]
        if isinstance(data, dict):
            data = data.get("exercises", data.get("questions", []))
        if not isinstance(data, list):
            raise ValueError(f"Format inattendu : {type(data)}")

        result = []
        for item in data:
            options = None
            if item.get("options"):
                options = [
                    MCQOption(label=o["label"], content=o["content"])
                    for o in item["options"]
                ]

            rubric = None
            if item.get("expected_answer_schema"):
                rubric = [
                    RubricStep(
                        description=s["description"],
                        points=float(s["points"]),
                    )
                    for s in item["expected_answer_schema"]
                ]

            result.append(ExerciseSchema(
                chapter_id=uuid.UUID(chapter_id),
                question_type=item["question_type"],
                prompt=item["prompt"],
                options=options,
                correct_answer=item.get("correct_answer"),
                expected_answer_schema=rubric,
                difficulty=item.get("difficulty", 2),
            ))
        return result

    except (json.JSONDecodeError, KeyError, TypeError) as e:
        raise ValueError(f"Exercise parse error: {e}\nRaw (300 chars): {raw[:300]}")


def _save_exercises(exercises: list[ExerciseSchema], chapter_id: str) -> list[ExerciseSchema]:
    if not exercises:
        return []

    rows = [
        {
            "chapter_id": chapter_id,
            "question_type": ex.question_type,
            "prompt": ex.prompt,
            "options": [o.model_dump() for o in (ex.options or [])],
            "correct_answer": ex.correct_answer,
            "expected_answer_schema": [s.model_dump() for s in (ex.expected_answer_schema or [])],
            "difficulty": ex.difficulty,
        }
        for ex in exercises
    ]
    result = supabase.table("exercises").insert(rows).execute()

    for ex, row in zip(exercises, (result.data or [])):
        ex.id = uuid.UUID(row["id"])

    return exercises


def _rows_to_schemas(rows: list[dict]) -> list[ExerciseSchema]:
    """Convertit des lignes DB en ExerciseSchema."""
    result = []
    for row in rows:
        options = [MCQOption(**o) for o in (row.get("options") or [])] or None
        rubric = [RubricStep(**r) for r in (row.get("expected_answer_schema") or [])] or None
        result.append(ExerciseSchema(
            id=uuid.UUID(row["id"]),
            chapter_id=uuid.UUID(row["chapter_id"]),
            question_type=row["question_type"],
            prompt=row["prompt"],
            options=options,
            correct_answer=row.get("correct_answer"),
            expected_answer_schema=rubric,
            difficulty=row.get("difficulty", 2),
        ))
    return result