"use client";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";

export default function ExercisesPage() {
  const router = useRouter();

  return (
    <div className="max-w-[700px] animate-fade-up">
      <div className="card empty-state py-16">
        <Icon name="pen" size={48} className="opacity-30 mb-5" />
        <h3 className="font-display text-2xl text-txt mb-3">Exercises</h3>
        <p className="text-sm leading-[1.6] max-w-[320px] mb-8">
          Exercises are generated per chapter. Open a chapter from your roadmap to start practicing.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <button onClick={() => router.push("/roadmap")} className="btn btn-primary">
            <Icon name="map" size={15} /> Go to roadmap
          </button>
          <button onClick={() => router.push("/chapters")} className="btn btn-outline">
            <Icon name="book" size={15} /> Browse chapters
          </button>
        </div>
      </div>
    </div>
  );
}
