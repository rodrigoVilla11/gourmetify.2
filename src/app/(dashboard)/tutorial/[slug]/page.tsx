"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getTutorialBySlug, IMPACT_META, DIFFICULTY_META, getTutorialBySlug as getRelated, type TutorialModule } from "@/data/tutorials";
import { useTutorialProgress } from "@/hooks/useTutorialProgress";
import TourGuide from "@/components/tutorial/TourGuide";

function ImpactBadge({ area }: { area: TutorialModule["impactAreas"][number] }) {
  const meta = IMPACT_META[area];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${meta.color}`}>
      {meta.emoji} {meta.label}
    </span>
  );
}

export default function TutorialDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const tutorial = getTutorialBySlug(slug);
  const { markViewed, markCompleted, markTourDone, unmarkCompleted, isCompleted, isTourDone } = useTutorialProgress();

  const [tourActive, setTourActive] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  useEffect(() => {
    if (tutorial) markViewed(tutorial.slug);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorial?.slug]);

  if (!tutorial) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-4">
        <p className="text-4xl">🔍</p>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Tutorial no encontrado</h1>
        <Link href="/tutorial" className="text-indigo-600 hover:text-indigo-700 text-sm">
          ← Volver a todos los tutoriales
        </Link>
      </div>
    );
  }

  const completed = isCompleted(slug);
  const tourDone = isTourDone(slug);
  const diffMeta = DIFFICULTY_META[tutorial.difficulty];
  const hasTour = !!tutorial.tourSteps?.length;

  const handleStartTour = () => {
    if (tutorial.pageHref && tutorial.pageHref !== window.location.pathname) {
      router.push(tutorial.pageHref);
    } else {
      setTourActive(true);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Link href="/tutorial" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          Academia
        </Link>
        <span>›</span>
        <span className="text-gray-700 dark:text-gray-300">{tutorial.title}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="text-4xl">{tutorial.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${diffMeta.color}`}>
              {diffMeta.label}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              ⏱ {tutorial.readTimeMinutes} min de lectura
            </span>
            {completed && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                ✓ Completado
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tutorial.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{tutorial.shortDescription}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {hasTour && (
          <button
            onClick={handleStartTour}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {tourDone ? "Repetir tour interactivo" : "Iniciar tour interactivo"}
          </button>
        )}
        {tutorial.pageHref && (
          <Link
            href={tutorial.pageHref}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Ir al módulo
          </Link>
        )}
        <button
          onClick={() => completed ? unmarkCompleted(slug) : markCompleted(slug)}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
            completed
              ? "text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50"
              : "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          {completed ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Completado
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Marcar como completado
            </>
          )}
        </button>
      </div>

      {/* Main content */}
      <div className="space-y-6">
        {/* Qué es */}
        <section className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-2">📌 ¿Qué es?</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{tutorial.content.queEs}</p>
        </section>

        {/* Para qué sirve */}
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">🎯 ¿Para qué sirve en tu negocio?</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{tutorial.content.paraQueSirve}</p>
        </section>

        {/* Pasos */}
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">📋 Cómo usarlo paso a paso</h2>
          <ol className="space-y-4">
            {tutorial.content.pasos.map((paso, i) => (
              <li key={i} className="flex gap-4">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{paso.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{paso.description}</p>
                  {hasTour && tutorial.tourSteps?.[i] && (
                    <button
                      onClick={() => { setActiveStep(i); setTourActive(true); }}
                      className="mt-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Ver en pantalla →
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Qué afecta */}
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">⚡ Qué datos impacta</h2>
          <div className="space-y-2">
            {tutorial.content.queAfecta.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <ImpactBadge area={item.area} />
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed pt-1">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Consejos */}
        <section className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-2xl p-5 space-y-2">
          <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-3">💡 Consejos</h2>
          <ul className="space-y-2">
            {tutorial.content.consejos.map((consejo, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                {consejo}
              </li>
            ))}
          </ul>
        </section>

        {/* Errores comunes */}
        <section className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3">⚠️ Errores comunes</h2>
          <div className="space-y-3">
            {tutorial.content.erroresComunes.map((item, i) => (
              <div key={i} className="space-y-1">
                <p className="text-xs font-medium text-red-700 dark:text-red-400">❌ {item.error}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed pl-4">✅ {item.solucion}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tour steps list */}
        {hasTour && (
          <section className="bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-900 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">🎮 Tour interactivo</h2>
              <button
                onClick={handleStartTour}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Iniciar tour
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {tutorial.tourSteps!.length} pasos guiados directo en la pantalla del módulo.
            </p>
            <ol className="space-y-2">
              {tutorial.tourSteps!.map((step, i) => (
                <li key={i} className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs flex items-center justify-center flex-shrink-0 font-medium">
                    {i + 1}
                  </span>
                  {step.title}
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Related */}
        {tutorial.relatedSlugs && tutorial.relatedSlugs.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">🔗 Tutoriales relacionados</h2>
            <div className="flex flex-wrap gap-2">
              {tutorial.relatedSlugs.map((rslug) => {
                const rel = getRelated(rslug);
                if (!rel) return null;
                return (
                  <Link
                    key={rslug}
                    href={`/tutorial/${rslug}`}
                    className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    {rel.emoji} {rel.title}
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Footer nav */}
      <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <Link
          href="/tutorial"
          className="text-sm text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          ← Todos los tutoriales
        </Link>
        {!completed && (
          <button
            onClick={() => markCompleted(slug)}
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
          >
            Marcar como completado ✓
          </button>
        )}
      </div>

      {/* Tour overlay */}
      {tourActive && tutorial.tourSteps && (
        <TourGuide
          steps={tutorial.tourSteps}
          slug={slug}
          onDone={() => { markTourDone(slug); setTourActive(false); setActiveStep(null); }}
          onClose={() => { setTourActive(false); setActiveStep(null); }}
        />
      )}
    </div>
  );
}
