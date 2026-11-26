import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { KnowledgePoint, Question } from "../types";
import { isAnswerCorrect, isTextQuestion, typeLabel, difficultyLabel } from "../utils/scoring";
import { renderMarkdown } from "../utils/markdown";
import DifficultyBadge from "./DifficultyBadge";
import PersonalNotes from "./PersonalNotes";
import { useProgressStore } from "../store/useProgressStore";
import { useAudioSynth } from "../hooks/useAudioSynth";
import { IconVolume, IconVolumeX } from "./icons";

function triggerConfetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.inset = "0";
  container.style.pointerEvents = "none";
  container.style.zIndex = "9999";
  document.body.appendChild(container);

  const colors = ["#3b82f6", "#10b981", "#fbbf24", "#ef4444", "#8b5cf6", "#ec4899"];

  for (let i = 0; i < 40; i++) {
    const el = document.createElement("div");
    el.style.position = "absolute";
    el.style.width = `${Math.random() * 6 + 6}px`;
    el.style.height = `${Math.random() * 6 + 6}px`;
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    el.style.borderRadius = "50%";
    el.style.left = "50%";
    el.style.top = "40%";

    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 120 + 80;
    const dx = Math.cos(angle) * velocity;
    const dy = Math.sin(angle) * velocity - 60;

    el.animate([
      { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.5)`, opacity: 0 }
    ], {
      duration: 800 + Math.random() * 400,
      easing: "ease-out"
    });

    container.appendChild(el);
  }

  setTimeout(() => {
    container.remove();
  }, 1300);
}

interface Props {
  reread?: { to: string; label: string };
  guideNext?: { to: string; label: string };
  questions: Question[];
  knowledgePoints?: KnowledgePoint[];
  // 是否立即判分（练习模式即时判分；考试模式不在此处判分）
  instant?: boolean;
  // 提交后回调（仅 instant=false 时由父组件调用 finish）
  onFinish?: (answers: Record<string, string[]>) => void;
  submitLabel?: string;
}

export default function QuestionPlayer({
  questions,
  guideNext,
  reread,
  knowledgePoints = [],
  instant = true,
  onFinish,
  submitLabel = "提交全部",
}: Props) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [judged, setJudged] = useState<Record<string, boolean>>({});
  const [shake, setShake] = useState(false);
  const recordAnswer = useProgressStore((s) => s.recordAnswer);
  const { muted, toggleMute, playSound } = useAudioSynth();

  const q = questions[current];
  const total = questions.length;

  const userAnswer = answers[q?.id] || [];
  const canPrev = current > 0;
  const canNext = current < total - 1;
  const isJudged = !!judged[q?.id];
  const isText = q ? isTextQuestion(q) : false;

  function setAns(arr: string[]) {
    setAnswers((prev) => ({ ...prev, [q.id]: arr }));
  }

  function toggleSingle(key: string) {
    setAns([key]);
  }

  function toggleMultiple(key: string) {
    if (userAnswer.includes(key)) {
      setAns(userAnswer.filter((k) => k !== key));
    } else {
      setAns([...userAnswer, key]);
    }
  }

  function setJudge(val: "T" | "F") {
    setAns([val]);
  }

  function commitInstant() {
    if (!instant || judged[q.id]) return;
    if (userAnswer.length === 0 || (isText && !userAnswer.join("").trim())) return;
    const correct = isAnswerCorrect(q, userAnswer);
    recordAnswer(q.id, userAnswer, correct);
    setJudged((p) => ({ ...p, [q.id]: true }));

    if (correct) {
      triggerConfetti();
      playSound("correct");
    } else {
      setShake(true);
      playSound("incorrect");
      setTimeout(() => setShake(false), 300);
    }
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

      if (!hasModifier && (q.type === "single" || q.type === "multiple") && !(isJudged && instant)) {
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
      } else if (!hasModifier && q.type === "judge" && !(isJudged && instant)) {
        if (key === "A" || key === "1" || key === "T") {
          setAns(["T"]);
        } else if (key === "B" || key === "2" || key === "F") {
          setAns(["F"]);
        }
      }

      if (e.key === "Enter" && !hasModifier) {
        e.preventDefault();
        if (instant && !isJudged) {
          commitInstant();
        } else if (canNext) {
          setCurrent((c) => c + 1);
        }
      }

      if ((e.ctrlKey || e.altKey) && e.key === "ArrowRight" && canNext) {
        e.preventDefault();
        setCurrent((c) => c + 1);
      }
      if ((e.ctrlKey || e.altKey) && e.key === "ArrowLeft" && canPrev) {
        e.preventDefault();
        setCurrent((c) => c - 1);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [q, isJudged, instant, userAnswer, canNext, canPrev]);

  const correctNow = useMemo(
    () => (isJudged && q ? isAnswerCorrect(q, userAnswer) : false),
    [isJudged, q, userAnswer]
  );

  if (total === 0) {
    return <p className="text-muted">暂无题目。</p>;
  }

  const answeredCount = Object.keys(answers).filter((k) =>
    (answers[k] || []).some((v) => v.trim() !== "")
  ).length;

  const qKps = q.knowledge_points?.length ? q.knowledge_points : q.knowledgePoints || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="tag tag-accent">
            {typeLabel(q.type)}
          </span>
          <DifficultyBadge difficulty={q.difficulty} />
          <span className="text-xs text-subtle">
            {current + 1} / {total} · 约 {q.estimated_time} 分钟
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMute}
            className="icon-btn"
            title={muted ? "开启答题音效" : "关闭答题音效"}
            aria-label={muted ? "开启答题音效" : "关闭答题音效"}
            type="button"
          >
            {muted ? <IconVolumeX size={15} /> : <IconVolume size={15} />}
          </button>
          <span className="text-xs text-subtle">已答 {answeredCount}/{total}</span>
        </div>
      </div>

      <div className={`question-panel card p-4 sm:p-6 transition-all duration-300 ${shake ? "animate-shake border-rose-500/30 shadow-lg shadow-rose-500/5" : ""}`}>
        <p className="question-stem text-body whitespace-pre-wrap">{q.stem}</p>

        <div className="mt-4 space-y-2">
          {q.type === "short" && <p className="text-xs text-muted">简答题按参考表述自动匹配，提交后可对照解析复核。</p>}
          {isText ? (
            <textarea
              value={userAnswer.join("")}
              onChange={(e) => setAns([e.target.value])}
              disabled={isJudged && instant}
              rows={q.type === "fill" || q.type === "calculation" ? 2 : 4}
              placeholder={q.type === "fill" ? "请输入填空答案…" : "请输入你的答案…"}
              aria-label="答案输入"
              className="input resize-y"
            />
          ) : q.type === "judge" ? (
            <div className="flex gap-3">
              {(["T", "F"] as const).map((v) => {
                const selected = userAnswer[0] === v;
                const cls = isJudged && instant
                  ? v === q.answer[0]
                    ? "option-btn option-btn-correct"
                    : selected
                      ? "option-btn option-btn-wrong"
                      : "option-btn"
                  : selected
                    ? "option-btn option-btn-selected"
                    : "option-btn";
                return (
                  <button
                    key={v}
                    aria-pressed={selected}
                    type="button"
                    disabled={isJudged && instant}
                    onClick={() => setJudge(v)}
                    className={`${cls} !w-auto`}
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
              const showCorrect = isJudged && instant && q.answer.includes(opt.key);
              const showWrong = isJudged && instant && selected && !q.answer.includes(opt.key);
              const cls = showCorrect
                ? "option-btn option-btn-correct"
                : showWrong
                  ? "option-btn option-btn-wrong"
                  : selected
                    ? "option-btn option-btn-selected"
                    : "option-btn";
              return (
                <button
                  key={opt.key}
                  aria-pressed={selected}
                  type="button"
                  disabled={isJudged && instant}
                  onClick={() =>
                    q.type === "single" ? toggleSingle(opt.key) : toggleMultiple(opt.key)
                  }
                  className={cls}
                >
                  <span className={`option-key ${selected ? "option-key-selected" : ""}`}>
                    {/* 判分后用 ✓/✗ 图形标记对错，避免仅靠颜色区分（色弱可辨） */}
                    {showCorrect ? "✓" : showWrong ? "✗" : opt.key}
                  </span>
                  <span className="whitespace-pre-wrap">{opt.text}</span>
                </button>
              );
            })
          )}
        </div>

        {isJudged && instant && (
          <div className="question-feedback mt-4 rounded-lg border border-line bg-surface-2 p-4">
            <p role="status" className={`text-sm font-medium ${correctNow ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
              {correctNow ? "✓ 回答正确" : "✗ 回答错误"}
            </p>
            <p className="mt-1 text-xs text-subtle">
              正确答案：{isText ? q.answer.join(" | ") : q.answer.join(", ")}
            </p>
            <div className="mt-3">{renderMarkdown(q.explanation || q.analysis || "")}</div>
            {!correctNow && reread && <Link className="mt-3 inline-block text-sm font-medium text-brand hover:underline"
              to={reread.to}>{reread.label}</Link>}
            {qKps.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {qKps.map((id) => {
                  const kpObj = knowledgePoints.find(
                    (k) => k.id === id || k.slug === id || k.title === id
                  );
                  if (kpObj) {
                    return (
                      <Link
                        key={id}
                        to={`/knowledge/${kpObj.slug}`}
                        className="tag tag-accent hover:opacity-85 transition"
                      >
                        {kpObj.title}
                      </Link>
                    );
                  }
                  return (
                    <span key={id} className="tag">
                      {id}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <PersonalNotes targetType="question" targetId={q.id} />
      </div>

      {/* Question Navigation Grid */}
      <div className="card p-4">
        <h4 className="text-[10px] font-bold text-subtle mb-3 tracking-widest uppercase">
          答题卡导航 (Ctrl+左/右 快捷翻页)
        </h4>
        <div className="flex flex-wrap gap-2">
          {questions.map((item, idx) => {
            const isCurrent = idx === current;
            const itemAns = answers[item.id] || [];
            const isAnswered = itemAns.some((v) => v.trim() !== "");
            const itemJudged = !!judged[item.id];

            let btnClass = "flex h-9 w-9 items-center justify-center rounded-xl border text-xs font-bold transition-all duration-200 ";

            if (itemJudged && instant) {
              const correct = isAnswerCorrect(item, itemAns);
              if (correct) {
                btnClass += "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20";
              } else {
                btnClass += "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20 hover:bg-rose-500/20";
              }
            } else if (isAnswered) {
              btnClass += "bg-accent-soft text-brand border-accent/30 hover:opacity-90";
            } else {
              btnClass += "border-line bg-surface-2 text-muted hover:text-body hover:border-line-strong";
            }

            if (isCurrent) {
              btnClass += " ring-2 ring-accent ring-offset-2 ring-offset-[color:var(--bg)]";
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrent(idx)}
                className={btnClass}
                aria-current={isCurrent ? "step" : undefined}
                title={`第 ${idx + 1} 题`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="btn-ghost"
          disabled={!canPrev}
          onClick={() => setCurrent((c) => c - 1)}
        >
          上一题
        </button>

        {instant && !isJudged && userAnswer.some((v) => v.trim() !== "") && (
          <button type="button" className="btn-primary" onClick={commitInstant}>
            提交本题
          </button>
        )}

        <div className="flex gap-2">
          {canNext ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setCurrent((c) => c + 1)}
            >
              下一题
            </button>
          ) : !instant ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => onFinish?.(answers)}
              disabled={answeredCount === 0}
            >
              {submitLabel}
            </button>
          ) : guideNext ? (
            isJudged && <Link className="btn-primary" to={guideNext.to}>{guideNext.label}</Link>
          ) : (
            <Link className="btn-ghost" to="/wrong">查看错题本</Link>
          )}
        </div>
      </div>

      {!instant && (
        <div className="card p-3 text-xs text-subtle">
          共 {total} 题（{difficultyLabel(q.difficulty)}等），已答 {answeredCount} 题。
          点击右下「{submitLabel}」结束并生成成绩。
        </div>
      )}
    </div>
  );
}
