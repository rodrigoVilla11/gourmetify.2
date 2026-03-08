"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { TourStep } from "@/data/tutorials";

interface TourGuideProps {
  steps: TourStep[];
  slug: string;
  onDone: () => void;
  onClose: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;

export default function TourGuide({ steps, slug, onDone, onClose }: TourGuideProps) {
  const [current, setCurrent] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const step = steps[current];

  const measureTarget = useCallback(() => {
    const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null;
    if (!el) {
      setTargetRect(null);
      setPanelPos(null);
      return;
    }

    // Remove previous highlight
    document.querySelectorAll("[data-tour-active]").forEach((e) => e.removeAttribute("data-tour-active"));

    el.setAttribute("data-tour-active", "true");
    el.scrollIntoView({ behavior: "smooth", block: "center" });

    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const r: Rect = {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      };
      setTargetRect(r);

      // Position panel below or above the element
      const panelH = panelRef.current?.offsetHeight ?? 180;
      const panelW = Math.min(360, window.innerWidth - 32);
      const spaceBelow = window.innerHeight - rect.bottom;
      const top =
        spaceBelow >= panelH + PADDING * 2
          ? r.top + r.height + PADDING * 2
          : r.top - panelH - PADDING * 2;

      let left = r.left;
      if (left + panelW > window.innerWidth + window.scrollX - 16) {
        left = window.innerWidth + window.scrollX - panelW - 16;
      }
      if (left < 16) left = 16;

      setPanelPos({ top, left });
    }, 350);
  }, [step.target]);

  useEffect(() => {
    measureTarget();
    return () => {
      document.querySelectorAll("[data-tour-active]").forEach((e) => e.removeAttribute("data-tour-active"));
    };
  }, [measureTarget]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowRight" || e.key === "Enter") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const handleNext = () => {
    if (current < steps.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (current > 0) setCurrent((c) => c - 1);
  };

  const handleFinish = () => {
    document.querySelectorAll("[data-tour-active]").forEach((e) => e.removeAttribute("data-tour-active"));
    onDone();
  };

  const handleClose = () => {
    document.querySelectorAll("[data-tour-active]").forEach((e) => e.removeAttribute("data-tour-active"));
    onClose();
  };

  const isLast = current === steps.length - 1;

  return (
    <>
      {/* Dark overlay */}
      <div
        className="fixed inset-0 z-[998] bg-black/40 transition-opacity"
        onClick={handleClose}
      />

      {/* Highlight cutout — visible ring around target */}
      {targetRect && (
        <div
          className="fixed z-[999] pointer-events-none rounded-lg ring-4 ring-indigo-500 ring-offset-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
          style={{
            top: targetRect.top - PADDING,
            left: targetRect.left - PADDING,
            width: targetRect.width + PADDING * 2,
            height: targetRect.height + PADDING * 2,
          }}
        />
      )}

      {/* Floating panel */}
      <div
        ref={panelRef}
        className="fixed z-[1000] w-[360px] max-w-[calc(100vw-32px)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5"
        style={
          panelPos
            ? { top: panelPos.top, left: panelPos.left }
            : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
            Paso {current + 1} de {steps.length}
          </span>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Cerrar tour"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
          <div
            className="h-1.5 bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${((current + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{step.title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{step.content}</p>

        {/* Keyboard hint */}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
          Usa las teclas ← → o Esc para navegar
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={handlePrev}
            disabled={current === 0}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-30 transition-colors"
          >
            ← Anterior
          </button>
          <button
            onClick={handleNext}
            className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            {isLast ? "Finalizar tour" : "Siguiente →"}
          </button>
        </div>
      </div>
    </>
  );
}
