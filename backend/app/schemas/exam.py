from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
from app.schemas.exercise import QuestionType, MCQOption, RubricStep


class ExamQuestionSchema(BaseModel):
    id: Optional[uuid.UUID] = None
    chapter_id: Optional[uuid.UUID] = None
    question_type: QuestionType
    prompt: str
    options: Optional[List[MCQOption]] = None
    correct_answer: Optional[str] = None
    rubric: Optional[List[RubricStep]] = None
    points: float = Field(default=1.0, ge=0.0)
    order_index: int


class ExamSchema(BaseModel):
    id: Optional[uuid.UUID] = None
    roadmap_id: uuid.UUID
    chapter_id: Optional[uuid.UUID] = None   # Peuplé si mini-examen
    title: str
    time_limit: Optional[int] = None          # Minutes
    question_count: int = Field(default=10, ge=1)
    questions: List[ExamQuestionSchema] = []
    is_mini_exam: bool = False                # True = évaluation par chapitre


class ExamGenerateRequest(BaseModel):
    roadmap_id: uuid.UUID
    chapter_id: Optional[uuid.UUID] = None   # None = examen global
    time_limit: Optional[int] = None
    question_count: int = Field(default=10, ge=1, le=50)


class SectionScore(BaseModel):
    chapter_id: str
    chapter_title: str
    score: float
    max_score: float


class ExamResult(BaseModel):
    submission_id: uuid.UUID
    total_score: float
    max_score: float
    percentage: float = Field(ge=0.0, le=100.0)
    section_scores: List[SectionScore]
    feedback: str
    submitted_at: Optional[str] = None
    passed: bool = False   # True si percentage >= passing_score du chapitre