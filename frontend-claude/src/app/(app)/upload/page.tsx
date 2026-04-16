"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { projectsApi, documentsApi, sourcesApi } from "@/lib/api";
import Icon from "@/components/ui/Icon";

type Step = "project" | "files" | "done";

export default function UploadPage() {
  const [step, setStep] = useState<Step>("project");
  const [project, setProject] = useState({
    title: "", subject: "", target_exam_type: "",
    deadline: "", hours_per_day: "2", days_per_week: "5",
  });
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [links, setLinks] = useState<string[]>([""]);
  const [uploading, setUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // ── Step 1: Create project ──
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const p = await projectsApi.create({
        title: project.title,
        subject: project.subject || undefined,
        target_exam_type: project.target_exam_type || undefined,
        deadline: project.deadline || undefined,
        hours_per_day: project.hours_per_day ? parseFloat(project.hours_per_day) : undefined,
        days_per_week: project.days_per_week ? parseInt(project.days_per_week) : undefined,
      });
      setCreatedProjectId(p.id);
      setStep("files");
    } catch (e: any) {
      setError(e.message);
    }
  };

  // ── Step 2: Upload files ──
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      f.type === "application/pdf" || f.type === "text/plain"
    );
    setFiles((prev) => [...prev, ...dropped]);
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...picked]);
  };

  const handleUploadAll = async () => {
    if (!createdProjectId) return;
    setUploading(true);
    setError("");

    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload each file to Supabase Storage then ingest
      for (const file of files) {
        const path = `${user.id}/${createdProjectId}/${Date.now()}_${file.name}`;
        const { data, error: storageError } = await supabase.storage
          .from("documents")
          .upload(path, file, { upsert: false });
        if (storageError) throw storageError;

        const { data: signedData, error: signedError } = await supabase.storage
      .from("documents")
  .createSignedUrl(path, 3600);
      if (signedError) throw signedError;
        const storageUrl = signedData.signedUrl;

        const res = await documentsApi.ingest({
          storage_url: storageUrl,
          filename: file.name,
          project_id: createdProjectId,
          source_type: "exam",
        });
        setUploadedDocs((prev) => [...prev, res.document_id]);
      }

      // Add links
      for (const link of links.filter((l) => l.trim())) {
        await sourcesApi.add({ url: link.trim(), project_id: createdProjectId });
      }

      setStep("done");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  if (step === "done") {
    return (
      <div className="max-w-[600px] mx-auto animate-fade-up">
        <div className="card text-center py-12">
          <div className="w-16 h-16 rounded-full bg-success-dim flex items-center justify-center mx-auto mb-5">
            <Icon name="check" size={32} className="text-success" />
          </div>
          <h2 className="font-display text-[26px] font-bold mb-2">
            Materials uploaded!
          </h2>
          <p className="text-txt-muted text-sm mb-8 leading-[1.6]">
            Your documents are being processed. This takes 1–2 minutes.
            You can now generate your study roadmap.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => router.push(`/roadmap?projectId=${createdProjectId}`)}
              className="btn btn-primary btn-lg"
            >
              <Icon name="map" size={16} /> Generate roadmap
            </button>
            <button onClick={() => router.push("/dashboard")} className="btn btn-outline btn-lg">
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "files") {
    return (
      <div className="max-w-[640px] mx-auto animate-fade-up">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="badge badge-success">Step 2 of 2</span>
          </div>
          <h2 className="font-display text-[24px] font-bold">Add your study materials</h2>
          <p className="text-txt-muted text-sm mt-1">
            Upload PDFs or add web links. These become your RAG knowledge base.
          </p>
        </div>

        {/* Dropzone */}
        <div
          className={`dropzone mb-5 ${drag ? "drag" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-[40px] mb-3">📄</div>
          <h3 className="font-display text-xl mb-[6px] text-txt">
            Drop your files here
          </h3>
          <p className="text-[13px] text-txt-muted">
            Past exam papers, syllabuses, course notes · PDF or TXT
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt"
            multiple
            className="hidden"
            onChange={handleFilePick}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="flex flex-col gap-2 mb-5">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 bg-bg-surf border border-[rgba(255,255,255,0.07)] rounded-[10px] px-4 py-3">
                <Icon name="file" size={16} className="text-primary flex-shrink-0" />
                <span className="text-sm text-txt flex-1 truncate">{f.name}</span>
                <span className="text-xs text-txt-muted">{(f.size / 1024).toFixed(0)} KB</span>
                <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  className="btn btn-icon btn-ghost w-6 h-6 text-txt-muted hover:text-danger">
                  <Icon name="x" size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Links */}
        <div className="mb-6">
          <label className="label">Supplementary web links (optional)</label>
          <p className="text-xs text-txt-sub mb-3">
            Articles, Wikipedia pages, or course materials that complement your documents.
          </p>
          {links.map((link, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                className="input"
                type="url"
                placeholder="https://en.wikipedia.org/wiki/..."
                value={link}
                onChange={(e) => {
                  const updated = [...links];
                  updated[i] = e.target.value;
                  setLinks(updated);
                }}
              />
              {links.length > 1 && (
                <button onClick={() => setLinks((prev) => prev.filter((_, j) => j !== i))}
                  className="btn btn-icon btn-ghost text-txt-muted hover:text-danger">
                  <Icon name="x" size={14} />
                </button>
              )}
            </div>
          ))}
          <button onClick={() => setLinks((prev) => [...prev, ""])}
            className="btn btn-ghost btn-sm text-primary mt-1">
            <Icon name="plus" size={14} /> Add another link
          </button>
        </div>

        {error && (
          <div className="text-danger text-sm bg-danger-dim border border-[rgba(239,68,68,0.2)] rounded-[10px] px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => setStep("project")} className="btn btn-outline">
            ← Back
          </button>
          <button
            onClick={handleUploadAll}
            className="btn btn-primary flex-1 justify-center"
            disabled={uploading || (files.length === 0 && links.every((l) => !l.trim()))}
          >
            {uploading ? (
              <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading…</>
            ) : (
              <><Icon name="upload" size={15} /> Upload & continue</>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Step 1: Project info
  return (
    <div className="max-w-[560px] mx-auto animate-fade-up">
      <div className="mb-6">
        <span className="badge badge-primary mb-2">Step 1 of 2</span>
        <h2 className="font-display text-[24px] font-bold">Create a study plan</h2>
        <p className="text-txt-muted text-sm mt-1">Tell us about your exam so we can personalize your roadmap.</p>
      </div>

      <form onSubmit={handleCreateProject} className="card flex flex-col gap-4">
        <div>
          <label className="label">Study plan name *</label>
          <input className="input" type="text" placeholder="e.g. GCE Advanced Mathematics 2026"
            value={project.title} onChange={(e) => setProject({ ...project, title: e.target.value })} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Subject</label>
            <input className="input" type="text" placeholder="Mathematics"
              value={project.subject} onChange={(e) => setProject({ ...project, subject: e.target.value })} />
          </div>
          <div>
            <label className="label">Exam type</label>
            <input className="input" type="text" placeholder="GCE A-Level"
              value={project.target_exam_type} onChange={(e) => setProject({ ...project, target_exam_type: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="label flex items-center gap-2">
            <Icon name="clock" size={13} /> Exam deadline
          </label>
          <input className="input" type="date"
            value={project.deadline} onChange={(e) => setProject({ ...project, deadline: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Hours per day</label>
            <input className="input" type="number" min="0.5" max="12" step="0.5"
              value={project.hours_per_day} onChange={(e) => setProject({ ...project, hours_per_day: e.target.value })} />
          </div>
          <div>
            <label className="label">Days per week</label>
            <input className="input" type="number" min="1" max="7"
              value={project.days_per_week} onChange={(e) => setProject({ ...project, days_per_week: e.target.value })} />
          </div>
        </div>

        {error && (
          <div className="text-danger text-sm bg-danger-dim border border-[rgba(239,68,68,0.2)] rounded-[10px] px-4 py-3">
            {error}
          </div>
        )}

        <button type="submit" className="btn btn-primary w-full justify-center mt-2">
          Continue <Icon name="arrow" size={15} />
        </button>
      </form>
    </div>
  );
}
