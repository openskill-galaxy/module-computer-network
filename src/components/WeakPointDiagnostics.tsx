import { Link } from "react-router-dom";
import type { ModuleData } from "../data/loaders";
import { useProgressStore } from "../store/useProgressStore";

interface Props {
  data: ModuleData;
}

export default function WeakPointDiagnostics({ data }: Props) {
  const wrongs = useProgressStore((s) => s.wrongs);
  const wrongList = Object.keys(wrongs);

  if (wrongList.length === 0) {
    return (
      <div className="card p-5 border border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/20 text-center space-y-2">
        <div className="text-3xl">🎉</div>
        <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-300">暂无错题记录</h3>
        <p className="text-xs text-muted">完成一次练习或模拟考试后，可在这里回看需要复习的内容。</p>
      </div>
    );
  }

  // Calculate weak knowledge points (avoid empty [] truthiness)
  const kpMap: Record<string, number> = {};
  wrongList.forEach((qId) => {
    const q = data.questions.find((item) => item.id === qId);
    if (q) {
      const kps = q.knowledge_points?.length
        ? q.knowledge_points
        : q.knowledgePoints?.length
        ? q.knowledgePoints
        : [q.chapter || "基础概念"];
      kps.forEach((kp) => {
        kpMap[kp] = (kpMap[kp] || 0) + 1;
      });
    }
  });

  const sortedWeakPoints = Object.entries(kpMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="card p-5 space-y-4 border border-rose-500/20">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎯</span>
          <div>
            <h3 className="text-sm font-bold text-body tracking-wide">智能薄弱知识点诊断与攻坚</h3>
            <p className="text-[11px] text-subtle">根据已有 {wrongList.length} 道错题，自动定位需强化的薄弱环节</p>
          </div>
        </div>
        <Link to="/wrong" className="text-xs text-rose-700 dark:text-rose-300 hover:underline whitespace-nowrap">
          查看全部错题 ({wrongList.length}) →
        </Link>
      </div>

      <div className="space-y-3">
        {sortedWeakPoints.map(([kpId, count]) => {
          const kpObj = data.knowledgePoints.find(
            (k) => k.id === kpId || k.slug === kpId || k.title === kpId
          );
          const courseObj = !kpObj
            ? data.courses.find(
                (c) => c.id === kpId || c.slug === kpId || c.title === kpId
              )
            : undefined;
          const kpLabel = kpObj?.title || courseObj?.title || kpId;
          const relatedLesson =
            data.lessons.find((l) => l.knowledgePoints?.includes(kpObj?.id ?? kpId)) ||
            (courseObj
              ? data.lessons.find((l) => l.courseId === courseObj.id)
              : undefined) ||
            data.lessons.find((l) => l.title.includes(kpLabel) || l.summary.includes(kpLabel)) ||
            data.lessons[0];

          return (
            <div
              key={kpId}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-surface-2 border border-line"
            >
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {kpObj ? (
                    <Link
                      to={`/knowledge/${kpObj.slug}`}
                      className="text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 hover:underline truncate max-w-full"
                    >
                      薄弱项: {kpLabel}
                    </Link>
                  ) : courseObj ? (
                    <Link
                      to={`/courses/${courseObj.slug}`}
                      className="text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 hover:underline truncate max-w-full"
                    >
                      薄弱项: {kpLabel}
                    </Link>
                  ) : (
                    <span className="text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 truncate max-w-full">
                      薄弱项: {kpLabel}
                    </span>
                  )}
                  <span className="text-[11px] text-subtle whitespace-nowrap">关联错题 {count} 道</span>
                </div>
                {relatedLesson && (
                  <p className="text-[11px] text-muted truncate">推荐复习: {relatedLesson.title}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {kpObj && (
                  <Link
                    to={`/knowledge/${kpObj.slug}`}
                    className="btn-ghost text-xs py-1.5 px-3 whitespace-nowrap"
                  >
                    知识点
                  </Link>
                )}
                {relatedLesson && (
                  <Link
                    to={`/lessons/${relatedLesson.slug}`}
                    className="btn-ghost text-xs text-brand border-accent/30 py-1.5 px-3 whitespace-nowrap"
                  >
                    定向攻坚
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
