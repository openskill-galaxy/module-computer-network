import { useMemo } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import type { ModuleData } from "../data/loaders";
import type { ExamRecord } from "../types";
import ProgressBar from "../components/ProgressBar";
import RadarChart, { RadarDataPoint } from "../components/RadarChart";
import { useProgressStore } from "../store/useProgressStore";

export default function ExamResultPage({ data }: { data: ModuleData }) {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const exams = useProgressStore((s) => s.exams);

  const exam = data.exams.find((e) => e.slug === slug);

  const record = useMemo(() => {
    const stateRecord = (location.state as { record?: ExamRecord })?.record;
    if (!exam) return undefined;
    const attempt = new URLSearchParams(location.search).get("attempt");
    if (stateRecord?.examId === exam.id && (!attempt || stateRecord.startedAt === attempt)) return stateRecord;
    const matching = exams.filter((r) => r.examId === exam.id && (!attempt || r.startedAt === attempt));
    if (matching.length === 0) return undefined;
    return [...matching].sort((a, b) =>
      (b.finishedAt || "").localeCompare(a.finishedAt || "")
    )[0];
  }, [location.state, location.search, exam, exams]);

  const radarData: RadarDataPoint[] = useMemo(() => {
    if (!record) return [];

    const total = record.details.length;
    const answered = record.details.filter((d) => d.userAnswer.some((answer) => answer.trim()));
    const correct = answered.filter((d) => d.correct).length;
    const percent = (n: number, denominator: number) => denominator ? Math.round(n / denominator * 100) : 0;
    return [
      { label: "试卷得分", score: record.score },
      { label: "作答率", score: percent(answered.length, total) },
      { label: "得分题占比", score: percent(correct, total) },
    ];
  }, [record]);
  // Recommended review lessons for wrong questions
  const wrongLessons = useMemo(() => {
    if (!record) return [];
    const wrongQIds = record.details.filter((d) => !d.correct).map((d) => d.questionId);

    const lessonsSet = new Set<string>();
    wrongQIds.forEach((qId) => {
      const q = data.questions.find((qq) => qq.id === qId);
      const qKps = q?.knowledge_points?.length ? q.knowledge_points : q?.knowledgePoints || [];
      if (qKps.length > 0) {
        data.lessons.forEach((les) => {
          const kps = les.knowledgePoints || [];
          if (kps.some((kp: string) => qKps.includes(kp))) {
            lessonsSet.add(les.slug);
          }
        });
      }
    });

    return Array.from(lessonsSet).map((s) => data.lessons.find((l) => l.slug === s)).filter(Boolean);
  }, [record, data]);

  if (!record) {
    return (
      <div className="space-y-4 text-center py-10">
        <p className="text-muted">未找到本次测验成绩数据。</p>
        <Link className="btn-ghost" to="/exams">返回测验中心</Link>
      </div>
    );
  }

  const minutes = Math.floor(record.durationSeconds / 60);
  const seconds = record.durationSeconds % 60;

  return (
    <div className="space-y-8">
      <header className="text-center">
        <div className={`text-5xl ${record.passed ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
          {record.passed ? "🎉" : "😞"}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-body">
          {record.passed ? "恭喜考成！已达通关线" : "未达及格线，建议复习攻坚"}
        </h1>
        <p className="mt-2 text-4xl font-extrabold text-body">
          {record.score}
          <span className="text-lg text-subtle"> 分</span>
        </p>
        <p className="mt-1 text-sm text-muted">
          用时 {minutes} 分 {seconds} 秒 · 及格线 {exam?.passingScore ?? 60} 分
        </p>
      </header>

      <ProgressBar value={record.score} />

      {/* Competency Radar Diagnostic Card */}
      <section className="card p-6 md:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
          <h2 className="text-base font-bold text-body tracking-wide flex items-center gap-2">
            本次考试表现
          </h2>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-around gap-6">
          <RadarChart data={radarData} size={280} />

          <div className="space-y-3 flex-1 max-w-sm">
            <h3 className="text-xs font-bold text-brand uppercase tracking-wider">针对性攻坚建议</h3>
            {record.score >= 80 ? (
              <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                本次考试取得 {record.score} 分。可以逐题回顾作答，再选择下一套试卷。
              </p>
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                逐题回顾本次考试，优先复习答错或跳过的题目。
              </p>
            )}

            {wrongLessons.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-semibold text-subtle block">推荐重点讲义复习:</span>
                <div className="flex flex-wrap gap-2">
                  {wrongLessons.slice(0, 4).map((les) => (
                    <Link
                      key={les!.slug}
                      to={`/lessons/${les!.slug}`}
                      className="tag hover:border-line-strong hover:text-body transition py-1 text-xs"
                    >
                      {les!.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Answer Details Section */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-body">逐题评分与答题回顾</h2>
        <div className="card divide-y divide-line overflow-hidden">
          {record.details.map((d, idx) => {
            const q = data.questions.find((qq) => qq.id === d.questionId);
            return (
              <div key={idx} className="px-4 py-3 flex items-start gap-3 hover:bg-surface-2/60 transition">
                <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  d.correct ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                }`}>
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-body line-clamp-2 leading-relaxed">{q?.stem || d.questionId}</p>
                  <p className="mt-1 text-xs text-subtle">
                    你的答案：<span className={d.correct ? "text-emerald-700 dark:text-emerald-300 font-semibold" : "text-rose-700 dark:text-rose-300 font-semibold"}>{d.userAnswer.join(", ") || "未作答"}</span> · 正确答案：<span className="text-body font-semibold">{q?.answer.join(", ") || "?"}</span>
                  </p>
                </div>
                <span className={`text-sm font-bold shrink-0 ${d.correct ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                  {d.correct ? "✓ 得分" : "✗ 未得分"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap gap-3 justify-center pt-2">
        {exam && <Link className="btn-primary px-6" to={`/exams/${exam.slug}`}>重新考试</Link>}
        <Link className="btn-ghost" to="/exams">返回测验列表</Link>
      </div>
    </div>
  );
}
