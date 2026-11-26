import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import ProgressBar from "../components/ProgressBar";
import type { ModuleData } from "../data/loaders";
import { useProgressStore } from "../store/useProgressStore";
import type { LearningRoute } from "../types";

function RouteCard({ route, data }: { route: LearningRoute; data: ModuleData }) {
  const progress = useProgressStore((state) => state.progress);
  const steps = [...route.steps].sort((a, b) => a.order - b.order).map((step) => {
    const lesson = data.lessons.find((item) => item.id === step.lessonId);
    const course = data.courses.find((item) => item.id === step.courseId);
    const knowledge = data.knowledgePoints.find((item) => item.id === step.knowledgePointId);
    return { step, lesson, course, knowledge, status: lesson && (progress[lesson.id]?.status ?? "not-started") };
  });
  const tracked = steps.filter((item) => item.lesson);
  const remaining = tracked.filter((item) => item.status !== "completed");
  const completed = tracked.length - remaining.length;
  const minutes = remaining.reduce((total, item) => total + (item.lesson?.estimatedMinutes ?? 0), 0);
  const hasTimeEstimates = remaining.every((item) => (item.lesson?.estimatedMinutes ?? 0) > 0);
  const next = remaining[0];
  const nextNumber = next ? steps.indexOf(next) + 1 : 0;

  return (
    <section id={route.slug} aria-labelledby={`title-${route.slug}`} className="card scroll-mt-20 p-4 sm:p-6">
      <h2 id={`title-${route.slug}`} className="text-lg font-bold text-body">{route.title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">{route.summary}</p>
      {tracked.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
            <p className="font-semibold text-body">已完成 {completed} / {tracked.length} 节讲义</p>
            {next && hasTimeEstimates && <p className="text-xs text-muted">待完成讲义约 {minutes} 分钟</p>}
          </div>
          <ProgressBar value={Math.round(completed / tracked.length * 100)} />
          {next?.lesson && (
            <Link to={`/lessons/${next.lesson.slug}`} className="btn-primary max-w-full text-sm">
              <span className="min-w-0">
                {next.status === "in-progress" ? "继续" : "学习"}第 {nextNumber} 步 · {next.lesson.title}
              </span>
            </Link>
          )}
        </div>
      )}
      <ol className="mt-5 space-y-4">
        {steps.map(({ step, lesson, course, knowledge, status }, index) => (
          <li key={step.order} className="flex items-start gap-3" aria-current={next?.step === step ? "step" : undefined}>
            <span aria-hidden="true" className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-muted">
              {status === "completed" ? "✓" : index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-body">
                {lesson ? <Link to={`/lessons/${lesson.slug}`} className="hover:underline">{step.title}</Link> : step.title}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{step.description}</p>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted">
                {status && <span>{status === "completed" ? "已完成" : status === "in-progress" ? "学习中" : "未开始"}</span>}
                {lesson && lesson.estimatedMinutes > 0 && <span>约 {lesson.estimatedMinutes} 分钟</span>}
                {course && <Link to={`/courses/${course.slug}`} className="text-accent hover:underline">{course.title}</Link>}
                {knowledge && <Link to={`/knowledge/${knowledge.slug}`} className="text-accent hover:underline">{knowledge.title}</Link>}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function RoutesPage({ data }: { data: ModuleData }) {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" });
  }, [hash]);

  return (
    <div className="space-y-6">
      <header className="work-heading">
        <h1 className="text-2xl font-bold text-body">学习路线</h1>
        <p className="mt-1 text-sm text-muted">按建议顺序学习。在讲义中标记完成后，这里的进度会同步更新。</p>
      </header>
      {data.routes.length === 0 ? (
        <p className="text-muted">暂无学习路线。</p>
      ) : (
        data.routes.map((route) => <RouteCard key={route.id} route={route} data={data} />)
      )}
    </div>
  );
}
