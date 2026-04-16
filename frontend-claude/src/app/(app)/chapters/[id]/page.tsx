"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { chaptersApi } from "@/lib/api";
import type { Lesson, Exercise, GradingResult, ChatMessage } from "@/types";
import Icon from "@/components/ui/Icon";

type Tab = "lesson" | "chat" | "exercises";

export default function ChapterPage() {
  const { id: chapterId } = useParams<{ id: string }>();
  const params = useSearchParams();
  const projectId = params.get("projectId") || "";
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("lesson");
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [error, setError] = useState("");

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Exercise grading state
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, GradingResult>>({});
  const [grading, setGrading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (tab === "lesson" && !lesson) loadLesson();
    if (tab === "exercises" && exercises.length === 0) loadExercises();
  }, [tab]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  const loadLesson = async () => {
    setLessonLoading(true);
    setError("");
    try {
      const l = await chaptersApi.getLesson(chapterId);
      setLesson(l);
    } catch (e: any) { setError(e.message); }
    finally { setLessonLoading(false); }
  };

  const loadExercises = async () => {
    setExercisesLoading(true);
    setError("");
    try {
      const ex = await chaptersApi.getExercises(chapterId, 5);
      setExercises(ex);
    } catch (e: any) { setError(e.message); }
    finally { setExercisesLoading(false); }
  };

  const sendMessage = async () => {
    if (!input.trim() || chatLoading) return;
    const userMsg: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setChatLoading(true);

    try {
      const stream = await chaptersApi.chat(chapterId, userMsg.content, messages);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let aiContent = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        aiContent += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: aiContent };
          return updated;
        });
      }
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${e.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const gradeExercise = async (ex: Exercise) => {
    if (!ex.id) return;
    const answer = ex.question_type === "mcq"
      ? selected[ex.id]
      : textAnswers[ex.id];
    if (!answer) return;

    setGrading((prev) => ({ ...prev, [ex.id!]: true }));
    try {
      const result = await chaptersApi.gradeAnswer(ex.id, answer);
      setResults((prev) => ({ ...prev, [ex.id!]: result }));
    } catch (e: any) { setError(e.message); }
    finally { setGrading((prev) => ({ ...prev, [ex.id!]: false })); }
  };

  const markComplete = async () => {
    try {
      await chaptersApi.complete(chapterId);
      router.push(`/roadmap?projectId=${projectId}`);
    } catch (e: any) { setError(e.message); }
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "lesson", label: "Lesson", icon: "book" },
    { id: "chat", label: "AI Tutor", icon: "brain" },
    { id: "exercises", label: "Exercises", icon: "pen" },
  ];

  return (
    <div className="max-w-[900px] animate-fade-up">
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-bg-surf border border-[rgba(255,255,255,0.07)] rounded-[10px] p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-[7px] rounded-lg text-sm font-medium transition-all
              ${tab === t.id ? "bg-primary text-white" : "text-txt-muted hover:text-txt"}`}
          >
            <Icon name={t.icon} size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-danger text-sm bg-danger-dim border border-[rgba(239,68,68,0.2)] rounded-[10px] px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* ── LESSON TAB ── */}
      {tab === "lesson" && (
        <div className="card">
          {lessonLoading ? (
            <div className="flex flex-col gap-4">
              <div className="skeleton h-6 w-3/4" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-5/6" />
              <div className="skeleton h-4 w-4/5" />
              <div className="skeleton h-4 w-full mt-4" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          ) : lesson ? (
            <>
              {/* Lesson content */}
              <div
                className="prose prose-invert max-w-none text-sm leading-[1.75] text-txt mb-6"
                style={{ fontSize: "14px", lineHeight: "1.75" }}
              >
                <LessonContent content={lesson.content} />
              </div>

              {/* Examples */}
              {lesson.examples.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-display text-[17px] font-semibold mb-3 flex items-center gap-2">
                    <Icon name="zap" size={16} className="text-accent" />
                    Worked examples
                  </h3>
                  <div className="flex flex-col gap-3">
                    {lesson.examples.map((ex, i) => (
                      <div key={i} className="bg-bg-surf border border-[rgba(255,255,255,0.07)] rounded-[10px] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2">
                          Example {i + 1}: {ex.title}
                        </p>
                        <p className="text-sm text-txt leading-[1.7] whitespace-pre-wrap">{ex.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources */}
              {lesson.source_references.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-[13px] font-semibold text-txt-muted uppercase tracking-wide mb-3">
                    Sources
                  </h3>
                  <div className="flex flex-col gap-2">
                    {lesson.source_references.slice(0, 4).map((ref, i) => (
                      <div key={i} className="source-box">
                        <strong className="text-[12px] font-semibold text-txt block mb-1">
                          {ref.type === "web" ? "🌐 Web" : "📄 Document"}{" "}
                          {ref.url && <a href={ref.url} target="_blank" rel="noreferrer"
                            className="text-primary hover:underline ml-1 text-[11px]">{ref.url.slice(0, 60)}…</a>}
                        </strong>
                        {ref.excerpt}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-[rgba(255,255,255,0.07)]">
                <button onClick={() => setTab("chat")} className="btn btn-outline btn-sm">
                  <Icon name="brain" size={14} /> Ask AI tutor
                </button>
                <button onClick={() => setTab("exercises")} className="btn btn-outline btn-sm">
                  <Icon name="pen" size={14} /> Practice exercises
                </button>
                <button onClick={markComplete} className="btn btn-success btn-sm ml-auto">
                  <Icon name="check" size={14} /> Mark complete
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <Icon name="book" size={40} className="opacity-40 mb-4" />
              <h3 className="font-display text-xl text-txt mb-2">No lesson yet</h3>
              <p className="text-sm mb-5">Generate the lesson for this chapter.</p>
              <button onClick={loadLesson} className="btn btn-primary">
                <Icon name="zap" size={15} /> Generate lesson
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── CHAT TAB ── */}
      {tab === "chat" && (
        <div className="card flex flex-col" style={{ height: "600px" }}>
          <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4">
            {messages.length === 0 && (
              <div className="empty-state py-12">
                <Icon name="brain" size={40} className="opacity-40 mb-4" />
                <h3 className="font-display text-xl text-txt mb-2">AI Tutor</h3>
                <p className="text-sm max-w-[300px] leading-[1.6]">
                  Ask anything about this chapter. I&apos;ll answer based on your study materials.
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-bubble ${msg.role === "user" ? "chat-user" : "chat-ai"}`}
              >
                {msg.content}
                {msg.role === "assistant" && i === messages.length - 1 && chatLoading && (
                  <span className="cursor-blink" />
                )}
              </div>
            ))}
            {chatLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="chat-bubble chat-ai">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="flex gap-3 pt-3 border-t border-[rgba(255,255,255,0.07)]">
            <input
              className="input flex-1"
              placeholder="Ask a question about this chapter…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              disabled={chatLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || chatLoading}
              className="btn btn-primary btn-icon w-10 h-10"
            >
              <Icon name="send" size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── EXERCISES TAB ── */}
      {tab === "exercises" && (
        <div className="flex flex-col gap-4">
          {exercisesLoading ? (
            [1, 2, 3].map((i) => <div key={i} className="skeleton h-[160px] w-full" />)
          ) : exercises.length === 0 ? (
            <div className="card empty-state py-12">
              <Icon name="pen" size={40} className="opacity-40 mb-4" />
              <h3 className="font-display text-xl text-txt mb-2">No exercises yet</h3>
              <button onClick={loadExercises} className="btn btn-primary mt-4">
                <Icon name="zap" size={15} /> Generate exercises
              </button>
            </div>
          ) : (
            exercises.map((ex, idx) => (
              <ExerciseCard
                key={ex.id || idx}
                exercise={ex}
                index={idx}
                selected={ex.id ? selected[ex.id] : undefined}
                textAnswer={ex.id ? textAnswers[ex.id] || "" : ""}
                result={ex.id ? results[ex.id] : undefined}
                grading={ex.id ? grading[ex.id] || false : false}
                onSelectMCQ={(label) => {
                  if (!ex.id || results[ex.id]) return;
                  setSelected((p) => ({ ...p, [ex.id!]: label }));
                }}
                onTextChange={(val) => {
                  if (!ex.id) return;
                  setTextAnswers((p) => ({ ...p, [ex.id!]: val }));
                }}
                onGrade={() => gradeExercise(ex)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Lesson markdown renderer (simple) ──────────────────
function LessonContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        if (line.startsWith("# ")) return <h1 key={i} className="font-display text-2xl font-bold mt-4 mb-2 text-txt">{line.slice(2)}</h1>;
        if (line.startsWith("## ")) return <h2 key={i} className="font-display text-xl font-semibold mt-4 mb-2 text-txt">{line.slice(3)}</h2>;
        if (line.startsWith("### ")) return <h3 key={i} className="font-display text-lg font-semibold mt-3 mb-2 text-txt">{line.slice(4)}</h3>;
        if (line.startsWith("- ") || line.startsWith("* ")) return <li key={i} className="ml-4 mb-1 text-txt-muted list-disc">{line.slice(2)}</li>;
        if (line.startsWith("**") && line.endsWith("**")) return <strong key={i} className="text-txt block">{line.slice(2, -2)}</strong>;
        if (line === "") return <div key={i} className="h-2" />;
        return <p key={i} className="text-txt-muted mb-1">{line}</p>;
      })}
    </>
  );
}

// ── Exercise card ───────────────────────────────────────
function ExerciseCard({
  exercise, index, selected, textAnswer, result, grading,
  onSelectMCQ, onTextChange, onGrade,
}: {
  exercise: Exercise;
  index: number;
  selected?: string;
  textAnswer: string;
  result?: GradingResult;
  grading: boolean;
  onSelectMCQ: (label: string) => void;
  onTextChange: (val: string) => void;
  onGrade: () => void;
}) {
  const diffLabels = ["", "Easy", "Medium", "Hard"];
  const diffColors = ["", "text-success", "text-accent", "text-danger"];

  return (
    <div className="exam-q">
      <div className="flex items-center justify-between mb-3">
        <span className="exam-q-num">Question {index + 1} · {exercise.question_type.replace("_", " ")}</span>
        <span className={`text-xs font-medium ${diffColors[exercise.difficulty] || ""}`}>
          {diffLabels[exercise.difficulty] || ""}
        </span>
      </div>
      <p className="exam-q-text">{exercise.prompt}</p>

      {/* MCQ */}
      {exercise.question_type === "mcq" && exercise.options && (
        <div className="flex flex-col gap-0">
          {exercise.options.map((opt) => {
            let cls = "";
            if (result) {
              if (opt.label === exercise.correct_answer) cls = "correct";
              else if (opt.label === selected) cls = "wrong";
            } else if (opt.label === selected) cls = "selected";

            return (
              <div
                key={opt.label}
                className={`choice ${cls}`}
                onClick={() => onSelectMCQ(opt.label)}
              >
                <div className="w-[26px] h-[26px] rounded-full border-[1.5px] border-current flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  {opt.label}
                </div>
                {opt.content}
              </div>
            );
          })}
        </div>
      )}

      {/* Short answer / Structured */}
      {(exercise.question_type === "short_answer" || exercise.question_type === "structured") && (
        <textarea
          className="input"
          rows={4}
          placeholder="Write your answer here…"
          value={textAnswer}
          onChange={(e) => onTextChange(e.target.value)}
          disabled={!!result}
          style={{ resize: "vertical" }}
        />
      )}

      {/* Grade button */}
      {!result && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={onGrade}
            disabled={grading || (!selected && !textAnswer)}
            className="btn btn-primary btn-sm"
          >
            {grading ? (
              <><span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Grading…</>
            ) : "Submit answer"}
          </button>
        </div>
      )}

      {/* Feedback */}
      {result && (
        <div className={`answer-feedback mt-3 ${result.is_correct ? "correct" : "wrong"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">
              {result.is_correct ? "✓ Correct!" : "✗ Incorrect"} — Score: {result.score.toFixed(0)}%
            </span>
          </div>
          <p className="text-sm leading-[1.6]">{result.feedback}</p>
          {result.improvement_suggestions.length > 0 && (
            <ul className="mt-2 text-sm list-disc list-inside opacity-80">
              {result.improvement_suggestions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
