import { useState, useEffect } from "react";
import { useDemoStore } from "../demo/demoStore";
import { STAGE_ORDER, STAGE_LABELS } from "../demo/workflowTypes";
import { getLifecycleProgress, formatStageForDisplay } from "../demo/workflowEngine";

// ═══════════════════════════════════════════════════════════════════════
// DemoControls — demo control panel for judges (hidden behind Shift+D)
// Reset, Advance, Jump to Stage, Speed
// ═══════════════════════════════════════════════════════════════════════

export function DemoControls() {
  const { currentStage, completedStages, advanceStage, resetDemo, goToStage, isDemoMode, demoSpeed } =
    useDemoStore();
  const [showPanel, setShowPanel] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [hotkeyEnabled, setHotkeyEnabled] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.code !== "KeyD") return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      setHotkeyEnabled((v) => !v);
      setShowPanel(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const progress = getLifecycleProgress(completedStages);
  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  const isAtEnd = currentIdx >= STAGE_ORDER.length - 1;

  const handleAdvance = () => {
    if (!isAtEnd) {
      advanceStage();
    }
  };

  const handleReset = () => {
    if (confirmReset) {
      resetDemo();
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
    }
  };

  const handleJump = (stage: typeof STAGE_ORDER[number]) => {
    goToStage(stage);
  };

  if (!isDemoMode || !hotkeyEnabled) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1.5"
      >
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        Demo Controls
      </button>

      {/* Panel */}
      {showPanel && (
        <div className="fixed bottom-14 right-4 z-50 bg-white border rounded-xl shadow-2xl p-4 w-[380px] max-h-[80vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">Demo Control Panel</h3>
            <button onClick={() => setShowPanel(false)} className="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
          </div>

          {/* Current Status */}
          <div className="bg-blue-50 rounded-lg p-3 mb-3">
            <div className="text-[10px] text-blue-600 uppercase font-medium">Current Stage</div>
            <div className="text-sm font-bold text-blue-900">{STAGE_LABELS[currentStage]}</div>
            <div className="text-[10px] text-blue-600 mt-1">
              {completedStages.length} of {STAGE_ORDER.length} stages completed ({progress}%)
            </div>
            {/* Mini progress bar */}
            <div className="w-full h-1.5 bg-blue-200 rounded-full mt-2">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={handleAdvance}
              disabled={isAtEnd}
              className="flex-1 bg-emerald-600 text-white text-xs font-semibold py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Advance → {isAtEnd ? "Done" : STAGE_LABELS[STAGE_ORDER[currentIdx + 1]]}
            </button>
            <button
              onClick={handleReset}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                confirmReset
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {confirmReset ? "Confirm Reset?" : "Reset"}
            </button>
          </div>

          {/* Jump to Stage */}
          <div className="mb-3">
            <div className="text-[10px] text-slate-500 uppercase font-medium mb-1.5">Jump to Stage</div>
            <div className="grid grid-cols-2 gap-1 max-h-[200px] overflow-y-auto">
              {STAGE_ORDER.map((stage, idx) => {
                const isCompleted = completedStages.includes(stage);
                const isCurrent = stage === currentStage;
                return (
                  <button
                    key={stage}
                    onClick={() => handleJump(stage)}
                    className={`text-left text-[10px] px-2 py-1.5 rounded border transition-colors ${
                      isCurrent
                        ? "bg-blue-100 border-blue-300 text-blue-800 font-semibold"
                        : isCompleted
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="font-mono mr-1">{idx + 1}.</span>
                    {STAGE_LABELS[stage]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="text-[9px] text-slate-400 text-center border-t pt-2">
            SIH 2026 — Demo Mode — All data is fictional
          </div>
        </div>
      )}
    </>
  );
}
