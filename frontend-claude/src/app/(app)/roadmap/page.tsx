"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { roadmapApi, documentsApi } from "@/lib/api";
import type { Roadmap, Chapter, UploadedDocument } from "@/types";
import Icon from "@/components/ui/Icon";

const statusColors: Record<string, string> = {
  completed: "roadmap-node-done",
  in_progress: "roadmap-node-current",
  available: "roadmap-node-current",
  locked: "roadmap-node-locked",
};

export default function RoadmapPage() {
  const params = useSearchParams();
  const router = useRouter();
  const projectId = params.get("projectId") || "";

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [docs, setDocs] = useState<UploadedDocument[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      roadmapApi.list(projectId).catch(() => []),
      documentsApi.list(projectId).catch(() => []),
    ]).then(([roadmaps, docs]) => {
      if (roadmaps.length > 0) setRoadmap(roadmaps[0]);
      setDocs(docs);
      setLoading(false);
    });
  }, [projectId]);

  const handleGenerate = async () => {
    if (!projectId) return;
    setGenerating(true);
    setError("");
    try {
      const r = await roadmapApi.generate(projectId);
      setRoadmap(r);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const readyDocs = docs.filter((d) => d.status === "ready");
  const processingDocs = docs.filter((d) =>
    ["parsing", "chunking", "embedding", "uploaded"].includes(d.status)
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="skeleton h-10 w-64" />
        <div className="skeleton h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-[860px] animate-fade-up">
      {/* Status bar */}
      {processingDocs.length > 0 && (
        <div className="card mb-5 flex items-center gap-3 border-accent/30 bg-accent-dim">
          <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin flex-shrink-0" />
          <p className="text-sm text-txt">
            <strong>{processingDocs.length}</strong> document(s) still processing…
            Please wait before generating the roadmap.
          </p>
        </div>
      )}

      {/* Generate button if no roadmap */}
      {!roadmap && (
        <div className="card text-center py-12 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary-dim flex items-center justify-center mx-auto mb-5">
            <Icon name="map" size={28} className="text-primary" />
          </div>
          <h2 className="font-display text-[24px] font-bold mb-2">Generate your roadmap</h2>
          <p className="text-txt-muted text-sm mb-6 max-w-sm mx-auto leading-[1.6]">
            {readyDocs.length > 0
              ? `${readyDocs.length} document(s) ready. Your AI-powered study plan is a click away.`
              : "Upload documents first to generate your roadmap."}
          </p>
          {error && (
            <div className="text-danger text-sm bg-danger-dim border border-[rgba(239,68,68,0.2)] rounded-[10px] px-4 py-3 mb-4 text-left">
              {error}
            </div>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating || readyDocs.length === 0}
            className="btn btn-primary btn-lg"
          >
            {generating ? (
              <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating…</>
            ) : (
              <><Icon name="zap" size={16} /> Generate roadmap</>
            )}
          </button>
        </div>
      )}

      {/* Roadmap display */}
      {roadmap && (
        <>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="font-display text-[26px] font-bold">{roadmap.title}</h2>
              <p className="text-txt-muted text-sm mt-1">
                {roadmap.chapters.length} chapters
                {roadmap.estimated_total_hours ? ` · ~${roadmap.estimated_total_hours}h total` : ""}
              </p>
            </div>
            <button onClick={handleGenerate} disabled={generating} className="btn btn-outline btn-sm">
              <Icon name="refresh" size={14} /> Regenerate
            </button>
          </div>

          <div className="flex flex-col">
            {roadmap.chapters.map((ch, i) => (
              <ChapterRow
                key={ch.id}
                chapter={ch}
                index={i}
                total={roadmap.chapters.length}
                onStudy={() => router.push(`/chapters/${ch.id}?projectId=${projectId}`)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ChapterRow({
  chapter, index, total, onStudy,
}: {
  chapter: Chapter;
  index: number;
  total: number;
  onStudy: () => void;
}) {
  const isLocked = chapter.status === "locked";
  const isDone = chapter.status === "completed";

  return (
    <div className="flex items-start gap-4 py-4">
      {/* Timeline */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`roadmap-node ${statusColors[chapter.status] || "roadmap-node-locked"}`}>
          {isDone ? <Icon name="check" size={14} /> : index + 1}
        </div>
        {index < total - 1 && (
          <div className="w-[2px] flex-1 bg-[rgba(255,255,255,0.07)] min-h-6 mt-1" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 pb-6 ${isLocked ? "opacity-50" : ""}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-[15px] font-semibold text-txt">{chapter.title}</h3>
              {chapter.status === "completed" && (
                <span className="badge badge-success">Completed</span>
              )}
              {chapter.status === "in_progress" && (
                <span className="badge badge-primary">In progress</span>
              )}
              {isLocked && (
                <span className="badge badge-neutral flex items-center gap-1">
                  <Icon name="lock" size={10} /> Locked
                </span>
              )}
            </div>
            {chapter.objective && (
              <p className="text-sm text-txt-muted leading-[1.5] mb-2">{chapter.objective}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-txt-sub flex-wrap">
              {chapter.estimated_hours && (
                <span className="flex items-center gap-1">
                  <Icon name="clock" size={11} /> ~{chapter.estimated_hours}h
                </span>
              )}
              <span>Importance:</span>
              <div className="inline-block w-20 h-[4px] bg-bg-raise rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.min(100, (chapter.importance / 3) * 100)}%` }}
                />
              </div>
            </div>
          </div>
          {!isLocked && (
            <button onClick={onStudy} className="btn btn-outline btn-sm flex-shrink-0">
              {isDone ? "Review" : "Study"} <Icon name="arrow" size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
