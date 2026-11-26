import { inPracticeCourse, practiceUrl } from "../utils/practiceReview";
import { Link, useSearchParams } from "react-router-dom";
import { usePracticeQueue } from "../hooks/usePracticeQueue";
import { useMemo, useState } from "react";
import type { ModuleData } from "../data/loaders";
import QuestionCard from "../components/QuestionCard";
import TagFilter from "../components/TagFilter";
import type { Difficulty } from "../types";
import { collectPageTags, matchesSelectedTags } from "../utils/tags";

export default function QuestionBankPage({ data }: { data: ModuleData }) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [diff, setDiff] = useState<Difficulty | "all">("all");
  const [keyword, setKeyword] = useState("");

  const [params, setParams] = useSearchParams();
  const requested = params.get("chapter") ?? "";
  const course = data.courses.find((item) => item.id === requested);
  const chapter = course?.id ?? "";
  const questions = useMemo(() => course ? data.questions.filter((q) => inPracticeCourse(q, course)) : data.questions, [course, data.questions]);
  const { history, due, fresh, incorrect, answered, pending, nextAt } = usePracticeQueue(questions);
  const [practiceFilter, setPracticeFilter] = useState("all");
  const dueIds = useMemo(() => new Set(due.map((q) => q.id)), [due]);
  const statuses = [
    ["all", "全部记录"], ["fresh", "未作答"], ["incorrect", "上次答错"],
    ["correct", "上次答对"], ["due", "已到期"],
  ];

  const pageTags = useMemo(
    () => collectPageTags(data.tags, questions.map((q) => q.tags || [])),
    [data.tags, questions]
  );

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return questions
      .filter((q) => {
        if (practiceFilter === "due") return dueIds.has(q.id);
        if (practiceFilter === "fresh") return !history[q.id];
        if (practiceFilter === "incorrect") return history[q.id]?.correct === false;
        if (practiceFilter === "correct") return history[q.id]?.correct === true;
        return true;
      })
      .filter((q) => diff === "all" || q.difficulty === diff)
      .filter((q) => matchesSelectedTags(q.tags || [], selectedTags, pageTags))
      .filter((q) =>
        kw ? `${q.stem} ${q.tags.join(" ")}`.toLowerCase().includes(kw) : true
      );
  }, [questions, diff, selectedTags, pageTags, keyword, practiceFilter, history, dueIds]);

  return (
    <div className="space-y-6">
      <header className="work-heading">
        <h1 className="text-2xl font-bold text-body">题库练习</h1>
        <p className="mt-1 text-sm text-muted">分章练习和到期复习，共 {data.questions.length} 道题</p>
      </header>

      <section className="practice-summary card space-y-3 p-4 sm:p-6" aria-labelledby="practice-overview">
        <h2 id="practice-overview" className="text-base font-semibold text-body">我的练习</h2>
        <label className="inline-flex max-w-full items-center gap-2 text-sm text-muted">
          <span className="shrink-0">练习章节</span>
          <select className="input min-w-0 max-w-full text-sm" value={chapter} onChange={(event) => {
            const next = new URLSearchParams(params);
            if (event.target.value) next.set("chapter", event.target.value); else next.delete("chapter");
            setSelectedTags([]);
            setParams(next, { replace: true });
          }}>
            <option value="">所有章节</option>
            {data.courses.filter((c) => data.questions.some((q) => inPracticeCourse(q, c))).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </label>
        <p className="text-sm text-muted">
          已作答 {answered} / {questions.length} 道，最近一次答对 {answered - incorrect} 道；当前到期 {due.length} 道。
        </p>
        <div className="flex flex-wrap gap-2">
          {due[0] && <Link className="btn-primary text-sm" to={practiceUrl(due[0].slug, "due", chapter)}>开始到期复习</Link>}
          {fresh[0] && <Link className={due.length ? "btn-ghost text-sm" : "btn-primary text-sm"}
            to={practiceUrl(fresh[0].slug, "new", chapter)}>做一道未练题</Link>}
        </div>
        {!due.length && Number.isFinite(nextAt) && <p className="text-xs text-muted">
          下次复习时间：{new Date(nextAt).toLocaleString("zh-CN", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>}
        {pending && <p role="status" className="text-sm text-body">浏览器暂时无法保存练习记录。请在离开前释放存储空间并再提交一道题。</p>}
        {answered > 0 && <p className="text-xs text-muted">答对的题也会安排复习。到期后再次答对，才会延长下一次间隔。</p>}
      </section>

      <div className="practice-filters">
        {pageTags.length > 0 && (
          <TagFilter tags={pageTags} selected={selectedTags} onChange={setSelectedTags} />
        )}

        <div className="flex flex-wrap gap-2">
          {(["all", "easy", "medium", "hard"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDiff(d)}
              aria-pressed={d === diff}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                diff === d
                  ? "bg-accent text-accent-fg shadow-sm"
                  : "border border-line bg-surface-2 text-muted hover:text-body hover:border-line-strong"
              }`}
            >
              {d === "all" ? "全部难度" : d === "easy" ? "简单" : d === "medium" ? "中等" : "困难"}
            </button>
          ))}
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-muted">
          作答记录
          <select className="input !w-auto text-sm" value={practiceFilter}
            onChange={(event) => setPracticeFilter(event.target.value)}>
            {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        <input
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          aria-label="搜索题目"
          placeholder="在本页快速搜索过滤题目…"
          className="input"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted">没有匹配的题目。</p>
      ) : (
        <div className="work-list">
          {filtered.map((q) => (
            <QuestionCard key={q.id} question={q} result={history[q.id]} />
          ))}
        </div>
      )}
    </div>
  );
}
