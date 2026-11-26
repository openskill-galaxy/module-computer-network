import { caseReviewed, hasCaseWork, readCaseWork } from "../utils/caseWork";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ModuleData } from "../data/loaders";
import DifficultyBadge from "../components/DifficultyBadge";
import TagFilter from "../components/TagFilter";
import type { Difficulty } from "../types";
import { collectPageTags, matchesSelectedTags } from "../utils/tags";

export default function CasesPage({ data }: { data: ModuleData }) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [diff, setDiff] = useState<Difficulty | "all">("all");
  const [keyword, setKeyword] = useState("");

  const pageTags = useMemo(
    () => collectPageTags(data.tags, data.cases.map((c) => c.tags || [])),
    [data.tags, data.cases]
  );

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return data.cases
      .filter((c) => diff === "all" || c.difficulty === diff)
      .filter((c) => matchesSelectedTags(c.tags || [], selectedTags, pageTags))
      .filter((c) =>
        kw ? `${c.title} ${c.summary} ${c.tags.join(" ")}`.toLowerCase().includes(kw) : true
      );
  }, [data.cases, diff, selectedTags, pageTags, keyword]);

  return (
    <div className="space-y-6">
      <header className="work-heading">
        <h1 className="text-2xl font-bold text-body">案例训练</h1>
        <p className="mt-1 text-sm text-muted">共 {data.cases.length} 个实战综合案例</p>
      </header>

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

      <input
        type="search"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        aria-label="搜索案例"
        placeholder="在本页快速搜索过滤案例…"
        className="input"
      />

      {filtered.length === 0 ? (
        <p className="text-muted">没有匹配的案例。</p>
      ) : (
        <div className="work-list">
          {filtered.map((c) => {
            const work = readCaseWork(c.id);
            return (
              <Link key={c.id} to={`/cases/${c.slug}`} className="card-hover block p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-bold text-body">{c.title}</h3>
                  <DifficultyBadge difficulty={c.difficulty} />
                </div>
                <p className="mt-2 text-sm text-muted line-clamp-3 leading-relaxed">{c.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.tags.slice(0, 3).map((t) => <span key={t} className="tag text-[10px]">{t}</span>)}
                </div>
                <p className="mt-3 text-xs font-medium text-subtle">约 {c.estimatedMinutes} 分钟{hasCaseWork(work) && (caseReviewed(c, work) ? " · 已自评" : " · 作答草稿")}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
