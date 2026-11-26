import ContentFeedback from "../components/ContentFeedback";
import { formatStudyTime } from "../utils/studyTime";
import { useEffect, useState, type ComponentType } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import type { ModuleData } from "../data/loaders";
import { renderMarkdown } from "../utils/markdown";
import { useProgressStore } from "../store/useProgressStore";
import { nowIso, writeJson } from "../utils/storage";
import LessonTOC from "../components/LessonTOC";
import PersonalNotes from "../components/PersonalNotes";
import SpeechReader from "../components/SpeechReader";
import { useSEO } from "../hooks/useSEO";

// Individual modules can attach subject-specific practice to an existing lesson.
const localActivity = import.meta.glob<{
  default: ComponentType<{ lessonId: string }>;
  lessonIds: string[];
}>("../../activities/lesson.tsx", { eager: true })["../../activities/lesson.tsx"];

export default function LessonPage({ data }: { data: ModuleData }) {
  const { slug } = useParams<{ slug: string }>();
  const progress = useProgressStore((s) => s.progress);
  const setLessonStatus = useProgressStore((s) => s.setLessonStatus);
  const toggleFavorite = useProgressStore((s) => s.toggleFavorite);
  const favorites = useProgressStore((s) => s.favorites);
  const [scrollProgress, setScrollProgress] = useState(0);

  const lesson = data.lessons.find((l) => l.slug === slug);
  const lessonId = lesson?.id;
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === "#lesson-activity" && lessonId) {
      document.getElementById("lesson-activity")?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [hash, lessonId]);

  useEffect(() => {
    if (lessonId) writeJson("last-lesson", { lessonId, visitedAt: nowIso() });
  }, [lessonId]);

  useSEO({
    title: lesson ? `${lesson.title} · ${data.module.title}` : data.module.title,
    description: lesson?.summary,
  });

  // Top reading scroll progress bar listener
  useEffect(() => {
    setScrollProgress(0);
    function handleScroll() {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentProgress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, currentProgress)));
      } else {
        setScrollProgress(0);
      }
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [slug]);

  if (!lesson) {
    return (
      <div className="space-y-4">
        <p className="text-white/70">未找到讲义：{slug}</p>
        <Link className="btn-ghost" to="/courses">返回课程</Link>
      </div>
    );
  }

  const LessonActivity = localActivity?.lessonIds.includes(lesson.id) ? localActivity.default : undefined;
  const course = data.courses.find((c) => c.id === lesson.courseId);
  const status = progress[lesson.id]?.status || "not-started";
  const kps = lesson.knowledgePoints.map((id) => data.knowledgePoints.find((k) => k.id === id)).filter(Boolean);
  const practice = (lesson.practiceQuestionIds ?? []).flatMap((id) => {
    const question = data.questions.find((item) => item.id === id);
    return question ? [question] : [];
  });
  const wordCount = lesson.contentMarkdown.replace(/\s+/g, "").length;

  // 同课程上下讲义导航
  const siblings = course
    ? course.lessons.map((lid) => data.lessons.find((l) => l.id === lid)).filter(Boolean)
    : [];
  const curIdx = siblings.findIndex((l) => l!.id === lesson.id);
  const prev = curIdx > 0 ? siblings[curIdx - 1] : null;
  const next = curIdx < siblings.length - 1 ? siblings[curIdx + 1] : null;

  return (
    <article className="lesson-reader space-y-7 relative">
      {/* Fixed Top Reading Scroll Progress Bar */}
      <div
        className="fixed top-0 left-0 h-1 bg-accent z-50 transition-all duration-150 print:hidden"
        style={{ width: `${scrollProgress}%` }}
      />

      <nav aria-label="讲义位置" className="reader-crumbs text-sm text-muted print:hidden">
        <Link to="/" className="hover:text-white">首页</Link>
        <span className="mx-2">/</span>
        <Link to="/courses" className="hover:text-white">课程</Link>
        {course && (
          <>
            <span className="mx-2">/</span>
            <Link to={`/courses/${course.slug}`} className="hover:text-white">{course.title}</Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-white/80">{lesson.title}</span>
      </nav>

      <header className="reader-heading space-y-3">
        <h1>{lesson.title}</h1>
        <p className="text-white/60">{lesson.summary}</p>
        <div className="flex flex-wrap gap-3 text-sm text-white/50">
          <span>讲义{formatStudyTime(lesson.estimatedMinutes)}</span>
          <span>全文约 {wordCount.toLocaleString()} 字</span>
          <span className="print:hidden">
            {status === "completed" ? "✓ 已完成" : status === "in-progress" ? "◐ 进行中" : "○ 未开始"}
          </span>
        </div>
        <div className="reader-actions flex flex-wrap gap-2 print:hidden">
          {LessonActivity && <a className="btn-ghost text-xs" href="#lesson-activity">本讲编程练习 ↓</a>}
          {status === "not-started" && (
            <button type="button" className="btn-primary text-xs" onClick={() => setLessonStatus(lesson.id, "in-progress")}>
              开始学习
            </button>
          )}
          {status === "in-progress" && (
            <button type="button" className="btn-primary text-xs" onClick={() => setLessonStatus(lesson.id, "completed")}>
              标记完成
            </button>
          )}
        </div>
        <div className="reader-tools flex flex-wrap items-center gap-2 print:hidden">
          <ContentFeedback module={data.module} item={{ section: "lessons", id: lesson.id, slug: lesson.slug, title: lesson.title }} />
          <SpeechReader text={lesson.contentMarkdown} />
          <button
            type="button"
            className="btn-ghost text-xs whitespace-nowrap"
            onClick={() => window.print()}
            title="导出 PDF 或打印讲义"
          >
            打印 / PDF
          </button>
          <button
            type="button"
            className="btn-ghost text-xs whitespace-nowrap"
            onClick={() => toggleFavorite({ type: "lesson", id: lesson.id })}
          >
            {favorites.some((f) => f.type === "lesson" && f.id === lesson.id) ? "★ 已收藏" : "☆ 收藏"}
          </button>
        </div>
      </header>

      {/* Main Content & TOC Sidebar Layout */}
      <div className="reader-body">
        <LessonTOC key={lesson.id} content={lesson.contentMarkdown} omitTitle={lesson.title} />
        <section className="reader-paper print:shadow-none print:border-0 print:p-0">
          <div key={lesson.id}>{renderMarkdown(lesson.contentMarkdown, lesson.title)}</div>
          <div className="mt-8 print:hidden">
            <PersonalNotes targetType="lesson" targetId={lesson.id} />
          </div>
        </section>
      </div>

      {LessonActivity && (
        <div id="lesson-activity" className="scroll-mt-20 print:hidden">
          <LessonActivity key={lesson.id} lessonId={lesson.id} />
        </div>
      )}

      {practice.length > 0 && (
        <section className="print:hidden">
          <h2 className="mb-3 text-lg font-semibold text-body">本讲练习</h2>
          <ul className="space-y-2">
            {practice.map((question) => (
              <li key={question.id}>
                <Link to={`/practice/${question.slug}`} className="block rounded-lg py-2 text-sm text-brand hover:underline">
                  {question.stem}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {kps.length > 0 && (
        <section className="print:hidden">
          <h2 className="text-lg font-semibold text-body mb-3">相关知识点</h2>
          <div className="flex flex-wrap gap-2">
            {kps.map((kp) => (
              <Link key={kp!.id} to={`/knowledge/${kp!.slug}`} className="tag tag-accent hover:opacity-85 transition">
                {kp!.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        {prev ? (
          <Link className="btn-ghost" to={`/lessons/${prev.slug}`}>← {prev.title}</Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link className="btn-primary" to={`/lessons/${next.slug}`}>{next.title} →</Link>
        ) : (
          <Link className="btn-ghost" to="/courses">返回课程列表</Link>
        )}
      </div>
    </article>
  );
}
