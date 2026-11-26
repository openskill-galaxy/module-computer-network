import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Exam, Question } from "../types";
import { isTextQuestion, typeLabel } from "../utils/scoring";
import { remainingSeconds, formatDuration, finishExam, readExamDraft, examDraftKey } from "../utils/exam";
import { useProgressStore } from "../store/useProgressStore";

interface Props {
  exam: Exam;
  questions: Question[];
}

export default function ExamPlayer({ exam, questions }: Props) {
  const [draft] = useState(() => readExamDraft(exam, questions));
  const { startedAt } = draft;
  const [remaining, setRemaining] = useState(() => remainingSeconds(startedAt, exam.timeLimitMinutes));
  const [current, setCurrent] = useState(draft.current);
  const [answers, setAnswers] = useState(draft.answers);
  const [submitting, setSubmitting] = useState(false);
  const draftKey = examDraftKey(exam);
  const navigate = useNavigate();
  const addExam = useProgressStore((s) => s.addExam);

  // 每次渲染同步最新答案到 ref，倒计时自动交卷时读取，避免闭包捕获旧答案
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const submittingRef = useRef(false);

  useEffect(() => {
    if (submittingRef.current || !questions.length) return;
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ startedAt, current, answers }));
    } catch {
      // Continue in memory if this tab cannot persist the draft.
    }
  }, [draftKey, startedAt, current, answers, questions.length]);

  useEffect(() => {
    if (!questions.length) return;
    const tick = () => {
      const r = remainingSeconds(startedAt, exam.timeLimitMinutes);
      setRemaining(r);
      if (r <= 0) submit();
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, exam.timeLimitMinutes]);

  const q = questions[current];
  const total = questions.length;
  const userAnswer = answers[q?.id] || [];
  const answeredCount = Object.keys(answers).filter((k) =>
    (answers[k] || []).some((v) => v.trim() !== "")
  ).length;

  function setAns(arr: string[]) {
    if (submittingRef.current) return;
    if (remainingSeconds(startedAt, exam.timeLimitMinutes) === 0) {
      submit();
      return;
    }
    const next = { ...answersRef.current, [q.id]: arr };
    answersRef.current = next;
    setAnswers(next);
  }
  function toggleSingle(key: string) { setAns([key]); }
  function toggleMultiple(key: string) {
    setAns(userAnswer.includes(key) ? userAnswer.filter((k) => k !== key) : [...userAnswer, key]);
  }
  function setJudge(val: "T" | "F") { setAns([val]); }

  function submit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    const rec = finishExam(exam, questions, answersRef.current, startedAt);
    addExam(rec);
    try {
      sessionStorage.removeItem(draftKey);
    } catch {
      // Browser storage may be unavailable.
    }
    navigate(`/exams/${exam.slug}/result?attempt=${encodeURIComponent(rec.startedAt)}`, {
      replace: true, state: { record: rec },
    });
  }

  useEffect(() => {
    if (!q) return;

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target instanceof Element ? e.target : null;
      if (e.defaultPrevented || e.isComposing || document.querySelector('[aria-modal="true"]') ||
          target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])') ||
          (e.key === "Enter" && target?.closest("button, a[href], summary"))) {
        return;
      }

      const key = e.key.toUpperCase();
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey;

      if (!hasModifier && (q.type === "single" || q.type === "multiple")) {
        const optionKeys = (q.options ?? []).map((o) => o.key);
        let matchedKey = "";

        if (optionKeys.includes(key)) {
          matchedKey = key;
        } else if (["1", "2", "3", "4", "5", "6"].includes(key)) {
          const idx = parseInt(key, 10) - 1;
          if (idx < optionKeys.length) {
            matchedKey = optionKeys[idx];
          }
        }

        if (matchedKey) {
          if (q.type === "single") {
            toggleSingle(matchedKey);
          } else {
            toggleMultiple(matchedKey);
          }
        }
      } else if (!hasModifier && q.type === "judge") {
        if (key === "A" || key === "1" || key === "T") {
          setAns(["T"]);
        } else if (key === "B" || key === "2" || key === "F") {
          setAns(["F"]);
        }
      }

      if (e.key === "Enter" && !hasModifier) {
        e.preventDefault();
        if (current < total - 1) {
          setCurrent((c) => c + 1);
        }
      }

      if ((e.ctrlKey || e.altKey) && e.key === "ArrowRight" && current < total - 1) {
        e.preventDefault();
        setCurrent((c) => c + 1);
      }
      if ((e.ctrlKey || e.altKey) && e.key === "ArrowLeft" && current > 0) {
        e.preventDefault();
        setCurrent((c) => c - 1);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [q, current, total, userAnswer]);

  const isTimeUp = remaining <= 0;

  // 注意：Hook 必须位于任何提前 return 之前（Rules of Hooks）
  const grid = useMemo(
    () =>
      questions.map((qq, idx) => ({
        idx,
        answered: (answers[qq.id] || []).some((v) => v.trim() !== ""),
      })),
    [questions, answers]
  );

  if (total === 0) {
    return <p className="text-white/60">该考试暂无题目。</p>;
  }

  return (
    <div className="space-y-5">
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white">{exam.title}</h1>
          <p className="text-xs text-white/50">
            共 {total} 题 · 限时 {exam.timeLimitMinutes} 分钟 · 及格 {exam.passingScore} 分 (Ctrl+左/右 快捷翻页)
          </p>
        </div>
        <div className={`rounded-lg px-4 py-2 text-lg font-mono ${
          remaining < 60 ? "bg-rose-500/20 text-rose-700 dark:text-rose-300" : "bg-white/10 text-white"
        }`}>
          ⏱ {formatDuration(remaining)}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="rounded bg-brand-500/20 px-2 py-0.5 text-xs text-brand-100">
            {typeLabel(q.type)}
          </span>
          <span className="text-xs text-white/50">第 {current + 1} / {total} 题</span>
        </div>
        <p className="text-sm text-white whitespace-pre-wrap">{q.stem}</p>

        <div className="mt-4 space-y-2">
          {q.type === "short" && <p className="text-xs text-muted">简答题按参考表述自动匹配，提交后可对照解析复核。</p>}
          {isTextQuestion(q) ? (
            <textarea
              value={userAnswer.join("")}
              onChange={(e) => setAns([e.target.value])}
              rows={q.type === "fill" || q.type === "calculation" ? 2 : 4}
              placeholder={q.type === "fill" ? "请输入填空答案…" : "请输入你的答案…"}
              aria-label="答案输入"
              className="input resize-y"
            />
          ) : q.type === "judge" ? (
            <div className="flex gap-3">
              {(["T", "F"] as const).map((v) => {
                const selected = userAnswer[0] === v;
                return (
                  <button
                    key={v}
                    aria-pressed={selected}
                    type="button"
                    onClick={() => setJudge(v)}
                    className={`option-btn !w-auto ${selected ? "option-btn-selected" : ""}`}
                  >
                    <span className={`option-key ${selected ? "option-key-selected" : ""}`}>
                      {v === "T" ? "√" : "×"}
                    </span>
                    {v === "T" ? "正确" : "错误"}
                  </button>
                );
              })}
            </div>
          ) : (
            (q.options ?? []).map((opt) => {
              const selected = userAnswer.includes(opt.key);
              return (
                <button
                  key={opt.key}
                  aria-pressed={selected}
                  type="button"
                  onClick={() => q.type === "single" ? toggleSingle(opt.key) : toggleMultiple(opt.key)}
                  className={`option-btn ${selected ? "option-btn-selected" : ""}`}
                >
                  <span className={`option-key ${selected ? "option-key-selected" : ""}`}>
                    {opt.key}
                  </span>
                  <span className="whitespace-pre-wrap">{opt.text}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="card p-4">
        <p className="mb-2 text-xs text-white/50">答题卡（已答 {answeredCount}/{total}）</p>
        <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
          {grid.map((g) => (
            <button
              key={g.idx}
              aria-current={g.idx === current ? "step" : undefined}
              title={`第 ${g.idx + 1} 题 · ${g.answered ? "已答" : "未答"}`}
              type="button"
              onClick={() => setCurrent(g.idx)}
              className={`h-9 rounded text-xs font-medium transition ${
                g.idx === current
                  ? "bg-brand-600 text-white"
                  : g.answered
                    ? "bg-accent-soft text-brand border border-accent/30"
                    : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}
            >
              {g.idx + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          className="btn-ghost"
          disabled={current === 0}
          onClick={() => setCurrent((c) => c - 1)}
        >
          上一题
        </button>
        <div className="flex gap-2">
          {current < total - 1 ? (
            <button type="button" className="btn-primary" onClick={() => setCurrent((c) => c + 1)}>
              下一题
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={submit}
              disabled={submitting}
            >
              交卷
            </button>
          )}
          {current < total - 1 && (
            <button type="button" className="btn-danger" onClick={submit} disabled={submitting}>
              提前交卷
            </button>
          )}
        </div>
      </div>

      <p aria-live="polite" className={`text-center text-sm ${isTimeUp ? "text-rose-700 dark:text-rose-300" : "text-muted"}`}>
        {isTimeUp ? "时间已到，自动交卷中…" : "答案会自动保存到此标签页，离开后可继续。"}
      </p>
    </div>
  );
}
