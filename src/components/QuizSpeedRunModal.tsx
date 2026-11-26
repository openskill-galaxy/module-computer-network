import { useProgressStore } from "../store/useProgressStore";
import { useState, useEffect, useMemo, useRef } from "react";
import type { Question } from "../types";
import { useAudioSynth } from "../hooks/useAudioSynth";
import { useModalA11y } from "../hooks/useModalA11y";

interface Props {
  questions: Question[];
  onClose: () => void;
}

export default function QuizSpeedRunModal({ questions, onClose }: Props) {
  const recordAnswer = useProgressStore((state) => state.recordAnswer);
  const { playSound } = useAudioSynth();
  const [timeLeft, setTimeLeft] = useState(60);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [finished, setFinished] = useState(false);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAdvanceTimer = () => {
    if (advanceTimerRef.current !== null) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  };

  // Keep the question order fixed while this challenge is open.
  const [shuffledQuestions] = useState(() => {
    const order = [...questions];
    for (let index = order.length - 1; index > 0; index--) {
      const pick = Math.floor(Math.random() * (index + 1));
      [order[index], order[pick]] = [order[pick], order[index]];
    }
    return order;
  });

  const currentQ = shuffledQuestions[currentIndex] || shuffledQuestions[0];
  const panelRef = useModalA11y(onClose);

  const resolvedOptions = useMemo(() => {
    if (!currentQ) return [];
    const raw = currentQ.options;
    const normalized = Array.isArray(raw)
      ? raw.map((opt: any) =>
          typeof opt === "object" && opt !== null
            ? { key: String(opt.key), text: String(opt.text ?? "") }
            : { key: String(opt), text: String(opt) }
        )
      : Object.entries((raw || {}) as Record<string, string>).map(([k, v]) => ({
          key: k,
          text: String(v),
        }));

    if (currentQ.type === "judge" && normalized.length === 0) {
      return [
        { key: "T", text: "正确" },
        { key: "F", text: "错误" },
      ];
    }
    return normalized;
  }, [currentQ]);

  useEffect(() => {
    return () => clearAdvanceTimer();
  }, []);

  useEffect(() => {
    if (finished) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [finished]);

  useEffect(() => {
    if (timeLeft === 0 && !finished) {
      clearAdvanceTimer();
      setFinished(true);
      playSound("timer");
    }
  }, [timeLeft, finished, playSound]);

  function handleSelectOption(optKey: string) {
    if (finished || selectedOpt !== null || !currentQ) return;
    setSelectedOpt(optKey);

    const isCorrect = currentQ.answer.includes(optKey);
    recordAnswer(currentQ.id, [optKey], isCorrect);
    if (isCorrect) {
      playSound("correct");
      setScore((s) => s + 10);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setMaxStreak((m) => Math.max(m, nextStreak));
    } else {
      playSound("incorrect");
      setStreak(0);
    }

    clearAdvanceTimer();
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      setSelectedOpt(null);
      if (currentIndex + 1 < shuffledQuestions.length) {
        setCurrentIndex((i) => i + 1);
      } else {
        setFinished(true);
        playSound("timer");
      }
    }, 600);
  }

  function handleRestart() {
    clearAdvanceTimer();
    setTimeLeft(60);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setFinished(false);
    setSelectedOpt(null);
  }

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="60 秒极速刷题挑战赛"
      className="fixed inset-0 !mt-0 z-50 flex items-center justify-center overflow-y-auto p-4 bg-black/60 backdrop-blur-md animate-fade-in"
    >
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        className="card max-w-xl w-full my-auto p-6 space-y-6 border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 shadow-soft-lg relative"
      >
        <button
          onClick={onClose}
          type="button"
          aria-label="关闭弹窗"
          className="absolute top-3 right-3 icon-btn"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4 pr-8">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚡</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-wide">60 秒极速刷题挑战赛</h2>
              <p className="text-xs text-slate-500 dark:text-white/50">60 秒内尽可能多答，连续答对会累计连胜。</p>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-xs text-slate-500 dark:text-white/50">倒计时:</span>
            <span className={`text-lg font-extrabold ${timeLeft <= 10 ? "text-rose-700 dark:text-rose-400 animate-pulse" : "text-cyan-700 dark:text-cyan-300"}`}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {!finished ? (
          <div className="space-y-5">
            {/* Stats Dashboard */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-white/[0.03] p-3 rounded-xl border border-slate-200 dark:border-white/5 text-xs font-mono text-slate-700 dark:text-slate-200">
              <div>
                得分: <strong className="text-emerald-700 dark:text-emerald-400 text-sm">{score}</strong> pts
              </div>
              <div>
                当前连胜: <strong className="text-amber-700 dark:text-amber-300 text-sm">{streak}</strong>
              </div>
              <div>
                最大连击: <strong className="text-cyan-700 dark:text-cyan-300 text-sm">{maxStreak}</strong>
              </div>
            </div>

            {/* Question Stem */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-subtle">
                第 {currentIndex + 1} / {shuffledQuestions.length} 题
              </span>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                {currentQ?.stem}
              </h3>
            </div>

            {/* Option Buttons */}
            <div className="grid gap-2.5">
              {resolvedOptions.map((opt) => {
                const key = opt.key;
                const text = opt.text;
                let btnStyle = "bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-900 dark:text-white";

                if (selectedOpt === key) {
                  if (currentQ?.answer.includes(key)) {
                    btnStyle = "bg-emerald-500/20 border-emerald-500/50 text-emerald-700 dark:text-emerald-300 font-bold";
                  } else {
                    btnStyle = "bg-rose-500/20 border-rose-500/50 text-rose-700 dark:text-rose-300 font-bold";
                  }
                }

                return (
                  <button
                    key={key}
                    onClick={() => handleSelectOption(key)}
                    disabled={selectedOpt !== null}
                    type="button"
                    className={`w-full p-3 rounded-xl border text-xs text-left transition flex items-center gap-3 ${btnStyle}`}
                  >
                    <span className="h-6 w-6 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center font-mono text-[11px] text-slate-700 dark:text-white/80">
                      {key}
                    </span>
                    <span className="flex-1">{text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Speed Run Result Summary */
          <div className="text-center py-6 space-y-5">
            <div className="text-5xl">🏆</div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">挑战结算完成！</h3>
              <p className="text-xs text-slate-500 dark:text-white/50">你的极限挑战成绩如下</p>
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 font-mono">
              <div className="space-y-1">
                <p className="text-[10px] text-subtle">最终得分</p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{score}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-subtle">答对题数</p>
                <p className="text-lg font-bold text-cyan-700 dark:text-cyan-300">{score / 10}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-subtle">最高连击</p>
                <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{maxStreak}</p>
              </div>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button onClick={handleRestart} className="btn-primary text-xs" type="button">重新挑战
              </button>
              <button onClick={onClose} className="btn-ghost text-xs" type="button">
                退出挑战
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
