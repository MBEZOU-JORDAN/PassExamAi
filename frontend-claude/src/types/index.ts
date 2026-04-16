// ── Core entities ──────────────────────────────────────

export type DocumentStatus = "uploaded" | "parsing" | "chunking" | "embedding" | "ready" | "failed";
export type DocumentSourceType = "exam" | "syllabus" | "notes" | "reference";
export type ChapterStatus = "locked" | "available" | "in_progress" | "completed";
export type QuestionType = "mcq" | "short_answer" | "structured";

export interface Project {
  id: string;
  user_id: string;
  title: string;
  subject?: string;
  target_exam_type?: string;
  deadline?: string;
  hours_per_day?: number;
  days_per_week?: number;
  created_at?: string;
}

export interface UploadedDocument {
  id: string;
  project_id: string;
  filename: string;
  storage_url: string;
  source_type: DocumentSourceType;
  status: DocumentStatus;
  chunks_count: number;
  error_message?: string;
  created_at?: string;
}

export interface UserSource {
  id: string;
  project_id: string;
  url: string;
  title?: string;
  description?: string;
  status: string;
  chunks_count: number;
  error_message?: string;
}

export interface Chapter {
  id: string;
  roadmap_id: string;
  order_index: number;
  title: string;
  objective?: string;
  importance: number;
  estimated_hours?: number;
  status: ChapterStatus;
}

export interface Roadmap {
  id: string;
  project_id: string;
  title: string;
  status: string;
  estimated_total_hours?: number;
  chapters: Chapter[];
  doc_content_hash?: string;
  created_at?: string;
}

export interface SourceReference {
  type: "doc" | "web";
  url?: string;
  excerpt: string;
  chunk_id?: string;
}

export interface Example {
  title: string;
  content: string;
}

export interface Lesson {
  id?: string;
  chapter_id?: string;
  content: string;
  examples: Example[];
  source_references: SourceReference[];
  visual_aids_description?: string;
}

export interface MCQOption {
  label: string;
  content: string;
}

export interface RubricStep {
  description: string;
  points: number;
}

export interface Exercise {
  id?: string;
  chapter_id?: string;
  question_type: QuestionType;
  prompt: string;
  options?: MCQOption[];
  correct_answer?: string;
  expected_answer_schema?: RubricStep[];
  difficulty: number;
}

export interface GradingResult {
  exercise_id?: string;
  score: number;
  is_correct: boolean;
  feedback: string;
  correct_answer?: string;
  improvement_suggestions: string[];
}

export interface ExamQuestion {
  id?: string;
  chapter_id?: string;
  question_type: QuestionType;
  prompt: string;
  options?: MCQOption[];
  correct_answer?: string;
  rubric?: RubricStep[];
  points: number;
  order_index: number;
}

export interface Exam {
  id?: string;
  roadmap_id: string;
  title: string;
  time_limit?: number;
  question_count: number;
  questions: ExamQuestion[];
}

export interface SectionScore {
  chapter_id: string;
  chapter_title: string;
  score: number;
  max_score: number;
}

export interface ExamResult {
  submission_id: string;
  total_score: number;
  max_score: number;
  percentage: number;
  section_scores: SectionScore[];
  feedback: string;
  submitted_at?: string;
}

export interface ProgressChapter {
  chapter_id: string;
  chapter_title: string;
  chapter_order: number;
  completion_status: ChapterStatus;
  last_seen_at?: string;
}

export interface ProjectProgress {
  project_id: string;
  total_chapters: number;
  completed_chapters: number;
  in_progress_chapters: number;
  completion_percentage: number;
  chapters: ProgressChapter[];
}

// ── Chat ────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ── API responses ───────────────────────────────────────

export interface DocumentIngestResponse {
  document_id: string;
  job_id: string;
  status: DocumentStatus;
  message: string;
}

export interface DocumentStatusResponse {
  document_id: string;
  status: DocumentStatus;
  chunks_count: number;
  error_message?: string;
  filename: string;
}
