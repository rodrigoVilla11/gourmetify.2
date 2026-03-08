"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "sq_tutorial_progress";

export interface TutorialProgress {
  viewed: string[];      // slugs of tutorials the user has opened
  completed: string[];   // slugs the user explicitly marked as done
  toursDone: string[];   // slugs where the in-page tour was completed
  lastVisited?: string;  // most recently opened slug
}

const DEFAULT_PROGRESS: TutorialProgress = {
  viewed: [],
  completed: [],
  toursDone: [],
};

function loadProgress(): TutorialProgress {
  if (typeof window === "undefined") return DEFAULT_PROGRESS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

function saveProgress(p: TutorialProgress): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // ignore quota errors
  }
}

export function useTutorialProgress() {
  const [progress, setProgress] = useState<TutorialProgress>(DEFAULT_PROGRESS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProgress(loadProgress());
    setHydrated(true);
  }, []);

  const update = useCallback((updater: (prev: TutorialProgress) => TutorialProgress) => {
    setProgress((prev) => {
      const next = updater(prev);
      saveProgress(next);
      return next;
    });
  }, []);

  const markViewed = useCallback(
    (slug: string) => {
      update((prev) => ({
        ...prev,
        viewed: prev.viewed.includes(slug) ? prev.viewed : [...prev.viewed, slug],
        lastVisited: slug,
      }));
    },
    [update]
  );

  const markCompleted = useCallback(
    (slug: string) => {
      update((prev) => ({
        ...prev,
        viewed: prev.viewed.includes(slug) ? prev.viewed : [...prev.viewed, slug],
        completed: prev.completed.includes(slug) ? prev.completed : [...prev.completed, slug],
      }));
    },
    [update]
  );

  const markTourDone = useCallback(
    (slug: string) => {
      update((prev) => ({
        ...prev,
        toursDone: prev.toursDone.includes(slug) ? prev.toursDone : [...prev.toursDone, slug],
      }));
    },
    [update]
  );

  const unmarkCompleted = useCallback(
    (slug: string) => {
      update((prev) => ({
        ...prev,
        completed: prev.completed.filter((s) => s !== slug),
      }));
    },
    [update]
  );

  const resetAll = useCallback(() => {
    update(() => DEFAULT_PROGRESS);
  }, [update]);

  const isViewed = (slug: string) => progress.viewed.includes(slug);
  const isCompleted = (slug: string) => progress.completed.includes(slug);
  const isTourDone = (slug: string) => progress.toursDone.includes(slug);

  return {
    progress,
    hydrated,
    markViewed,
    markCompleted,
    markTourDone,
    unmarkCompleted,
    resetAll,
    isViewed,
    isCompleted,
    isTourDone,
  };
}
