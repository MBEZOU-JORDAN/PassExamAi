"use client";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";

export default function ChaptersPage() {
  const router = useRouter();
  return (
    <div className="max-w-[700px] animate-fade-up">
      <div className="card empty-state py-16">
        <Icon name="book" size={48} className="opacity-30 mb-5" />
        <h3 className="font-display text-2xl text-txt mb-3">Chapter study</h3>
        <p className="text-sm leading-[1.6] max-w-[320px] mb-8">
          Select a chapter from your study roadmap to start learning with AI-generated lessons and exercises.
        </p>
        <button onClick={() => router.push("/roadmap")} className="btn btn-primary">
          <Icon name="map" size={15} /> Open roadmap
        </button>
      </div>
    </div>
  );
}
