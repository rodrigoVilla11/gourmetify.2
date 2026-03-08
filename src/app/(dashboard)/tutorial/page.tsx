"use client";

import Link from "next/link";
import {
  TUTORIALS,
  TUTORIAL_CATEGORIES,
  DIFFICULTY_META,
  IMPACT_META,
  getAllCategories,
  getTutorialsByCategory,
  type TutorialModule,
} from "@/data/tutorials";
import { useTutorialProgress } from "@/hooks/useTutorialProgress";

const BRAND = "#0f2f26";
const BRAND_LIGHT = "rgba(15,47,38,0.08)";
const BRAND_LIGHT2 = "rgba(15,47,38,0.05)";

function DifficultyBadge({ difficulty }: { difficulty: TutorialModule["difficulty"] }) {
  const meta = DIFFICULTY_META[difficulty];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
      {meta.label}
    </span>
  );
}

function ImpactDots({ areas }: { areas: TutorialModule["impactAreas"] }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {areas.slice(0, 3).map((area) => {
        const meta = IMPACT_META[area];
        return (
          <span key={area} title={meta.label} className={`text-xs px-1.5 py-0.5 rounded-md ${meta.color}`}>
            {meta.emoji}
          </span>
        );
      })}
      {areas.length > 3 && (
        <span className="text-xs text-gray-400 self-center">+{areas.length - 3}</span>
      )}
    </div>
  );
}

function TutorialCard({ tutorial, isCompleted, isViewed }: {
  tutorial: TutorialModule;
  isCompleted: boolean;
  isViewed: boolean;
}) {
  return (
    <Link
      href={`/tutorial/${tutorial.slug}`}
      className={`group relative flex flex-col p-4 rounded-2xl border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
        isCompleted
          ? "border-emerald-200 bg-emerald-50/60"
          : isViewed
          ? "border-gray-300 bg-gray-50"
          : "border-gray-200 bg-white"
      }`}
    >
      {/* Completed badge */}
      {isCompleted && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      {isViewed && !isCompleted && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
          <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
      )}

      {/* Emoji */}
      <div className="text-2xl mb-3">{tutorial.emoji}</div>

      {/* Title */}
      <h3
        className="text-sm font-semibold text-gray-900 mb-1 transition-colors group-hover:text-[#0f2f26]"
      >
        {tutorial.title}
      </h3>

      {/* Description */}
      <p className="text-xs text-gray-500 leading-relaxed mb-3 flex-1">
        {tutorial.shortDescription}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto">
        <DifficultyBadge difficulty={tutorial.difficulty} />
        <span className="text-xs text-gray-400">{tutorial.readTimeMinutes} min</span>
      </div>

      <div className="mt-2.5">
        <ImpactDots areas={tutorial.impactAreas} />
      </div>

      {tutorial.tourSteps && (
        <div
          className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: BRAND_LIGHT, color: BRAND }}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          </svg>
          Tour interactivo
        </div>
      )}
    </Link>
  );
}

export default function TutorialIndexPage() {
  const { progress, hydrated, resetAll } = useTutorialProgress();
  const categories = getAllCategories();

  const totalCompleted = hydrated ? progress.completed.length : 0;
  const totalViewed = hydrated ? progress.viewed.length : 0;
  const pct = Math.round((totalCompleted / TUTORIALS.length) * 100);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-10">

      {/* Hero */}
      <div className="text-center space-y-3">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
          style={{ backgroundColor: BRAND_LIGHT, color: BRAND }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Academia GOURMETIFY
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          Aprendé a usar el sistema
        </h1>
        <p className="text-gray-500 max-w-lg mx-auto text-sm leading-relaxed">
          Tutoriales paso a paso para cada módulo. Algunos incluyen tours interactivos que te guían
          directamente en la pantalla.
        </p>
      </div>

      {/* Progress card */}
      {hydrated && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Tu progreso</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {totalCompleted} de {TUTORIALS.length} módulos completados
                {totalViewed > 0 && ` · ${totalViewed} visitados`}
              </p>
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <span className="text-2xl font-bold" style={{ color: BRAND }}>{pct}%</span>
              {totalCompleted > 0 && (
                <button
                  onClick={() => { if (confirm("¿Reiniciar todo el progreso?")) resetAll(); }}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Reiniciar
                </button>
              )}
            </div>
          </div>

          {/* Bar */}
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: `linear-gradient(to right, ${BRAND}, #22c55e)` }}
            />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
            {Object.entries(IMPACT_META).map(([key, meta]) => (
              <span key={key} className="flex items-center gap-1 text-xs text-gray-500">
                {meta.emoji} {meta.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Category sections */}
      {categories.map((cat) => {
        const catMeta = TUTORIAL_CATEGORIES[cat];
        const modules = getTutorialsByCategory(cat);
        return (
          <section key={cat} className="space-y-4">
            {/* Section header */}
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0"
                style={{ backgroundColor: BRAND_LIGHT }}
              >
                {catMeta.emoji}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">{catMeta.label}</h2>
                <p className="text-xs text-gray-500">{catMeta.description}</p>
              </div>
              <div className="flex-1 h-px bg-gray-100 ml-2" />
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: BRAND_LIGHT2, color: BRAND }}
              >
                {modules.length}
              </span>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {modules.map((tutorial) => (
                <TutorialCard
                  key={tutorial.slug}
                  tutorial={tutorial}
                  isCompleted={hydrated && progress.completed.includes(tutorial.slug)}
                  isViewed={hydrated && progress.viewed.includes(tutorial.slug)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
