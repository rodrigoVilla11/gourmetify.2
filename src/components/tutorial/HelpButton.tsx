"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TourGuide from "./TourGuide";
import { getTutorialBySlug } from "@/data/tutorials";
import { useTutorialProgress } from "@/hooks/useTutorialProgress";

interface HelpButtonProps {
  /** slug of the tutorial module for this page */
  tutorialSlug: string;
  /** If true, clicking "Ver tutorial completo" opens tour directly if tourSteps exist */
  autoStartTour?: boolean;
  className?: string;
}

export default function HelpButton({ tutorialSlug, className = "" }: HelpButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const { markViewed, markTourDone, isTourDone } = useTutorialProgress();
  const tutorial = getTutorialBySlug(tutorialSlug);

  if (!tutorial) return null;

  const hasTour = !!tutorial.tourSteps?.length;
  const tourDone = isTourDone(tutorialSlug);

  const handleOpen = () => {
    markViewed(tutorialSlug);
    setOpen(true);
  };

  const handleGoToTutorial = () => {
    setOpen(false);
    router.push(`/tutorial/${tutorialSlug}`);
  };

  const handleStartTour = () => {
    setOpen(false);
    setTourActive(true);
  };

  const handleTourDone = () => {
    markTourDone(tutorialSlug);
    setTourActive(false);
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        title="¿Cómo usar esta sección?"
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200 transition-colors ${className}`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        ¿Cómo usar esta sección?
      </button>

      {/* Quick-help popover */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed bottom-6 right-6 z-50 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5 animate-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-lg">{tutorial.emoji}</span>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{tutorial.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{tutorial.shortDescription}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Quick summary */}
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              {tutorial.content.queEs}
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {hasTour && (
                <button
                  onClick={handleStartTour}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {tourDone ? "Repetir tour guiado" : "Iniciar tour guiado"}
                </button>
              )}
              <button
                onClick={handleGoToTutorial}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Ver tutorial completo
              </button>
            </div>
          </div>
        </>
      )}

      {/* In-page tour */}
      {tourActive && tutorial.tourSteps && (
        <TourGuide
          steps={tutorial.tourSteps}
          slug={tutorialSlug}
          onDone={handleTourDone}
          onClose={() => setTourActive(false)}
        />
      )}
    </>
  );
}
