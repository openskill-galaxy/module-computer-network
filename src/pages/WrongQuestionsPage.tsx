import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { ModuleData } from "../data/loaders";
import { useProgressStore } from "../store/useProgressStore";
import EmptyState from "../components/EmptyState";
import DifficultyBadge from "../components/DifficultyBadge";
import { typeLabel } from "../utils/scoring";
import { practiceUrl } from "../utils/practiceReview";
import { isItemDueForReview } from "../utils/srs";

export default function WrongQuestionsPage({ data }: { data: ModuleData }) {
  const wrongs = useProgressStore((s) => s.wrongs);
  const clearWrong = useProgressStore((s) => s.clearWrong);
  const clearAllWrongs = useProgressStore((s) => s.clearAllWrongs);

  const list = useMemo(
    () =>
      Object.values(wrongs)
        .map((w) => ({ wrong: w, question: data.questions.find((q) => q.id === w.questionId) }))
        .filter((x) => x.question)
        .sort((a, b) => (a.wrong.lastAt < b.wrong.lastAt ? 1 : -1)),
    [wrongs, data.questions]
  );

  const due = list.filter((item) => isItemDueForReview(item.wrong.nextReviewDate));
  const dueCount = due.length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-body">错题本</h1>
          <p className="mt-1 text-sm text-muted">共 {list.length} 道错题 · 今日待复习 {dueCount} 道</p>
        </div>
        {list.length > 0 && (
          <button type="button" className="btn-danger text-xs px-3 py-1.5" onClick={clearAllWrongs}>
            清空全部错题
          </button>
        )}
      </header>

      {/* SM-2 Ebbinghaus Memory Curve Banner */}
      {list.length > 0 && (
        <div className="card p-4 bg-gradient-to-r from-indigo-50 dark:from-indigo-950/60 to-slate-100 dark:to-slate-900 border-indigo-200 dark:border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧠</span>
            <div>
              <h3 className="text-sm font-bold text-body">错题复习</h3>
              <p className="text-xs text-muted mt-0.5">
                {dueCount > 0
                  ? `有 ${dueCount} 道错题已到复习时间。`
                  : "当前没有到期的错题，可在题库查看其他需要复习的题目。"}
              </p>
            </div>
          </div>
          {dueCount > 0 && (
            <Link to={practiceUrl(due[0].question!.slug, "due", "", true)} className="btn-primary text-xs shrink-0 py-2 font-bold">
              一键开启复习 ▶
            </Link>
          )}
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState
          emoji="🎉"
          title="暂无错题记录"
          hint="练习和考试中答错的题目会出现在这里。"
          action={<Link className="btn-primary font-bold" to="/questions">去题库练习</Link>}
        />
      ) : (
        <div className="space-y-3">
          {list.map(({ wrong, question }) => {
            const isDue = isItemDueForReview(wrong.nextReviewDate);
            const kps = question!.knowledge_points?.length
              ? question!.knowledge_points
              : question!.knowledgePoints?.length
              ? question!.knowledgePoints
              : [];
            const firstKpId = kps[0];
            const kpObj = firstKpId
              ? data.knowledgePoints.find(
                  (k) => k.id === firstKpId || k.slug === firstKpId || k.title === firstKpId
                )
              : undefined;
            const targetKpText = kpObj?.title || firstKpId || question!.chapter || "";
            const relatedLesson = data.lessons.find((lesson) => lesson.practiceQuestionIds?.includes(wrong.questionId)) ||
              (kps.length > 0 &&
                data.lessons.find((l) => l.knowledgePoints?.some((kp) => kps.includes(kp)))) ||
              (targetKpText
                ? data.lessons.find(
                    (l) => l.title.includes(targetKpText) || l.summary.includes(targetKpText)
                  )
                : undefined);

            return (
              <div key={wrong.questionId} className={`card p-4 transition ${isDue ? "border-indigo-500/40 bg-indigo-50/50 dark:bg-indigo-950/20" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="tag tag-accent">
                      {typeLabel(question!.type)}
                    </span>
                    <DifficultyBadge difficulty={question!.difficulty} />
                    <span className="text-xs text-rose-700 dark:text-rose-300 font-bold">错 {wrong.wrongCount} 次</span>
                    {isDue && (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" aria-hidden="true" />
                        今日到期复习
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-subtle">{wrong.lastAt.slice(0, 10)}</span>
                </div>
                <p className="mt-2 text-sm font-medium text-body line-clamp-3 leading-relaxed">{question!.stem}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link className="btn-primary text-xs font-bold px-3 py-1.5" to={`/practice/${question!.slug}`}>重做巩固</Link>
                    {kpObj && (
                      <Link
                        to={`/knowledge/${kpObj.slug}`}
                        className="btn-ghost text-xs text-brand py-1.5 px-3"
                      >
                        {kpObj.title}
                      </Link>
                    )}
                    {relatedLesson && (
                      <Link
                        to={`/lessons/${relatedLesson.slug}`}
                        className="btn-ghost text-xs text-brand py-1.5 px-3"
                      >
                        查阅源头讲义
                      </Link>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-ghost text-xs text-muted hover:text-rose-700 dark:hover:text-rose-300 py-1.5 px-3"
                    onClick={() => clearWrong(wrong.questionId)}
                  >
                    移除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
