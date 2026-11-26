import { courseMinutes, formatStudyTime, sumMinutes } from "../utils/studyTime";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { ModuleData } from "../data/loaders";
import { useProgressStore, lessonsOverall } from "../store/useProgressStore";
import ProgressBar from "../components/ProgressBar";
import DifficultyBadge from "../components/DifficultyBadge";
import KnowledgeGraph from "../components/KnowledgeGraph";
import CertificateModal from "../components/CertificateModal";
import StudyAnalytics from "../components/StudyAnalytics";
import WeakPointDiagnostics from "../components/WeakPointDiagnostics";
import QuizSpeedRunModal from "../components/QuizSpeedRunModal";
import {
  IconArrowRight,
  IconBook,
  IconBulb,
  IconPencil,
  IconBeaker,
} from "../components/icons";

export default function HomePage({ data }: { data: ModuleData }) {
  const progress = useProgressStore((s) => s.progress);
  const overall = lessonsOverall(data.lessons, progress);
  const wrongs = useProgressStore((s) => s.wrongs);
  const wrongCount = Object.keys(wrongs).length;
  const favCount = useProgressStore((s) => s.favorites).length;
  const exams = useProgressStore((s) => s.exams);
  const examCount = exams.length;
  const passingScores = exams.filter((r) => r.passed).map((r) => r.score);
  const bestPassedScore = passingScores.length ? Math.max(...passingScores) : undefined;
  const [showCert, setShowCert] = useState(false);
  const [showSpeedRun, setShowSpeedRun] = useState(false);

  const lessonMinutes = sumMinutes(data.lessons.map((lesson) => lesson.estimatedMinutes));

  const orderedCourses = [...data.courses].sort((a, b) => a.order - b.order);
  const orderedLessons = orderedCourses.flatMap((course) =>
    course.lessons.flatMap((id) => data.lessons.find((lesson) => lesson.id === id) ?? [])
  );
  const nextLesson = orderedLessons.find((lesson) => progress[lesson.id]?.status === "in-progress")
    ?? orderedLessons.find((lesson) => progress[lesson.id]?.status !== "completed");

  const links = [
    { to: "/courses", label: "课程列表", count: data.courses.length + " 门课", icon: IconBook },
    { to: "/knowledge", label: "知识点库", count: data.knowledgePoints.length + " 个知识点", icon: IconBulb },
    { to: "/questions", label: "题库练习", count: data.questions.length + " 道题", icon: IconPencil },
    { to: "/cases", label: "案例训练", count: data.cases.length + " 个案例", icon: IconBeaker },
  ];

  return (
    <div className="module-home">
      <section className="module-landing">
        <div className="module-intro">
          <h1>{data.module.title}</h1>
          <p>{data.module.description || data.module.subtitle}</p>
          <div className="module-contents">
            <span>{data.courses.length} 门课</span>
            <span>{data.lessons.length} 节讲义</span>
            <span>讲义{formatStudyTime(lessonMinutes)}</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link className="btn-primary" to="/courses">开始学习 <IconArrowRight size={16} /></Link>
            <Link className="btn-ghost" to="/routes">查看学习路线</Link>
          </div>
        </div>

        <section className="module-progress" aria-labelledby="module-progress-title">
          <div className="module-progress-head">
            <h2 id="module-progress-title">学习进度</h2>
            <span>{overall.percent}%</span>
          </div>
          <ProgressBar value={overall.percent} />
          <p className="mt-2 text-sm text-muted">已完成 {overall.completed} / {overall.total} 节讲义</p>
          <div className="module-next">
            {nextLesson ? (
              <Link to={`/lessons/${nextLesson.slug}`}>
                <span><small>{progress[nextLesson.id]?.status === "in-progress" ? "继续读这节" : "下一节讲义"}</small><strong>{nextLesson.title}</strong></span>
                <IconArrowRight size={16} className="shrink-0" />
              </Link>
            ) : <p className="text-sm text-muted">已学完全部讲义</p>}
          </div>
        </section>
      </section>

      <nav aria-label="模块学习入口" className="module-quick">
        {links.map(({ to, label, count, icon: Icon }) => (
          <Link key={to} to={to}><Icon size={19} /><span><strong>{label}</strong><small>{count}</small></span></Link>
        ))}
      </nav>

      <section className="space-y-3">
        <div className="module-heading">
          <h2>课程概览</h2>
          <Link to="/courses">查看全部 <IconArrowRight size={15} /></Link>
        </div>
        <ol className="course-sequence">
          {orderedCourses.map((course, index) => (
            <li key={course.id}>
              <Link to={`/courses/${course.slug}`} className="course-row">
                <span className="course-step">{index + 1}</span>
                <span className="min-w-0">
                  <strong>{course.title}</strong>
                  <small>{course.lessons.length} 节讲义　{formatStudyTime(courseMinutes(course.lessons, data.lessons))}</small>
                </span>
                <DifficultyBadge difficulty={course.difficulty} />
                <IconArrowRight size={16} className="shrink-0 text-brand" />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <div className="module-tools">
        <button onClick={() => setShowSpeedRun(true)} type="button" className="btn-ghost">60s 极速刷题赛</button>
        <button onClick={() => setShowCert(true)} type="button" className="btn-ghost">查看通关结业证书</button>
      </div>

      {showCert && (
        <CertificateModal
          moduleTitle={data.module.title}
          completed={overall.completed}
          total={overall.total}
          score={bestPassedScore}
          onClose={() => setShowCert(false)}
        />
      )}

      {showSpeedRun && (
        <QuizSpeedRunModal
          questions={data.questions.filter((q) => q.type === "single" || q.type === "judge")}
          onClose={() => setShowSpeedRun(false)}
        />
      )}

      <KnowledgeGraph data={data} />
      <WeakPointDiagnostics data={data} />

      <section className="space-y-3">
        <div className="module-heading"><h2>学习记录</h2></div>
        <StudyAnalytics />
        <div className="module-records">
          <Link to="/wrong"><strong>{wrongCount}</strong><span>查看错题本</span></Link>
          <Link to="/favorites"><strong>{favCount}</strong><span>查看收藏夹</span></Link>
          <Link to="/exams"><strong>{examCount}</strong><span>查看考试</span></Link>
        </div>
      </section>
    </div>
  );
}
