import { useEffect, useState } from "react";
import { IconTimer } from "./icons";

export default function PomodoroTimer() {
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isRunning && secondsLeft > 0) {
      timer = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isRunning) {
      setIsRunning(false);
      // Play Web Audio chime on completion
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } catch {
        // ignore audio errors
      }
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, secondsLeft]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  function resetTimer(mins = 25) {
    setIsRunning(false);
    setSecondsLeft(mins * 60);
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className={`btn-ghost text-xs flex items-center gap-1.5 h-9 px-2 sm:px-2.5 py-0 rounded-lg sm:rounded-full transition ${
          isRunning ? "border-accent/50 text-brand bg-accent-soft animate-pulse" : ""
        }`}
        title="番茄专注计时器"
        aria-label="番茄专注计时器"
        aria-expanded={isOpen}
      >
        <IconTimer size={16} />
        <span className="hidden sm:inline font-mono font-bold">{formattedTime}</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-11 z-50 w-64 max-w-[calc(100vw-2rem)] card p-4 bg-surface backdrop-blur-xl space-y-3 animate-fade-in"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <div className="flex items-center justify-between border-b border-line pb-2">
            <h4 className="text-xs font-bold text-body flex items-center gap-1.5">
              <span className="inline-flex"><IconTimer size={15} /></span> 专注番茄钟
            </h4>
            <button
              onClick={() => setIsOpen(false)}
              type="button"
              aria-label="关闭番茄钟面板"
              className="icon-btn !h-8 !w-8 text-xs"
            >
              ✕
            </button>
          </div>

          <div className="text-center py-2">
            <span className="text-3xl font-extrabold font-mono text-body tracking-widest block">
              {formattedTime}
            </span>
            <span className="text-[10px] text-subtle mt-1 block">
              {isRunning ? "保持专注学习中..." : "准备开始 25 分钟高效专注"}
            </span>
          </div>

          <div className="flex justify-center gap-2">
            <button
              onClick={() => setIsRunning(!isRunning)}
              type="button"
              className="btn-primary text-xs flex-1 py-1.5 font-bold"
            >
              {isRunning ? "暂停" : "开始专注"}
            </button>
            <button
              onClick={() => resetTimer(25)}
              type="button"
              className="btn-ghost text-xs py-1.5"
            >
              重置
            </button>
          </div>

          <div className="flex justify-center gap-1.5 pt-1.5 border-t border-line">
            {[15, 25, 45].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => resetTimer(m)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-muted hover:text-brand hover:bg-surface-2 transition"
              >
                {m}m
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
