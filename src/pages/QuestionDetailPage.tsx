import { useMemo } from "react";
import { inPracticeCourse, practiceUrl } from "../utils/practiceReview";
import { usePracticeQueue } from "../hooks/usePracticeQueue";
import ContentFeedback from "../components/ContentFeedback";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useProgressStore } from "../store/useProgressStore";
import type { ModuleData } from "../data/loaders";
import QuestionPlayer from "../components/QuestionPlayer";
import { useSEO } from "../hooks/useSEO";

export default function QuestionDetailPage({
  data,
  practice = false,
}: {
  data: ModuleData;
  practice?: boolean;
}) {
  const { slug } = useParams<{ slug: string }>();
  const question = data.questions.find((q) => q.slug === slug);

  const [params] = useSearchParams();
  const mode = practice ? params.get("queue") : null;
  const course = question ? data.courses.find((item) => inPracticeCourse(question, item)) : undefined;
  const scoped = course?.id === params.get("chapter") ? course : undefined;
  const chapter = scoped?.id ?? "";
  const fromWrongBook = mode === "due" && params.get("from") === "wrong";
  const wrongs = useProgressStore((state) => state.wrongs);
  const pool = useMemo(() => {
    if (fromWrongBook) return data.questions.filter((q) => wrongs[q.id]);
    return scoped ? data.questions.filter((q) => inPracticeCourse(q, scoped)) : data.questions;
  }, [scoped, data.questions, fromWrongBook, wrongs]);
  const { history, due, fresh, answered, pending } = usePracticeQueue(pool);
  const nextQuestion = (mode === "due" ? due : fresh).find((q) => q.id !== question?.id);
  const guided = mode === "due" || mode === "new";
  const next = guided && nextQuestion ? {
    to: practiceUrl(nextQuestion.slug, mode === "due" ? "due" : "new", chapter, fromWrongBook),
    label: mode === "due" ? "下一道到期题" : "下一道未练题",
  } : undefined;

  useSEO({
    title: question
      ? `${question.stem.slice(0, 24)} · ${data.module.title}`
      : data.module.title,
  });

  if (!question) {
    return <p className="text-white/70">未找到题目：{slug}</p>;
  }

  const record = history[question.id];
  const lesson = data.lessons.find((item) => item.id === question.chapter)
    ?? data.lessons.find((item) => item.practiceQuestionIds?.includes(question.id));
  const reread = lesson ? { to: "/lessons/" + lesson.slug, label: "回看讲义 · " + lesson.title }
    : course ? { to: "/courses/" + course.slug, label: "复习本章 · " + course.title } : undefined;
  const bank = fromWrongBook ? "/wrong" : chapter ? "/questions?" + new URLSearchParams({ chapter }) : "/questions";
  return (
    <div className="focus-workspace space-y-4">
      <h1 className="work-title text-body">
        {practice ? "练习模式" : "题目详情"}
      </h1>
      {guided && <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span>
          {mode === "due" ? `到期复习 · 还剩 ${due.length} 道` : `按章节练习 · 已作答 ${answered} / ${pool.length} 道`}
        </span>
        <Link className="text-brand hover:underline" to={bank}>{fromWrongBook ? "返回错题本" : "返回题库"}</Link>
      </div>}
      {pending && <p role="status" className="text-sm text-body">浏览器暂时无法保存练习记录。请在离开前释放存储空间并再提交一道题。</p>}
      {record && <p className="text-xs text-muted">
        {record.correct ? "上次答对" : "上次答错"} · 下次复习 {new Date(record.nextReviewDate).toLocaleString("zh-CN", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
      </p>}
      <ContentFeedback module={data.module} item={{ section: "questions", id: question.id, slug: question.slug, title: question.stem }} />
      {/* 单题浏览与练习均为即时判分模式：非即时路径缺少 onFinish 收尾，属死路径，故统一使用即时模式 */}
      <QuestionPlayer key={question.id} questions={[question]} knowledgePoints={data.knowledgePoints}
        reread={reread} guideNext={guided ? next ?? { to: bank, label: fromWrongBook ? "本组已完成，返回错题本" : "本组已完成，返回题库" } : undefined} />
    </div>
  );
}
