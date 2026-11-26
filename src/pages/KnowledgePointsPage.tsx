import { useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import type { ModuleData } from "../data/loaders";
import KnowledgePointCard from "../components/KnowledgePointCard";
import TagFilter from "../components/TagFilter";
import type { Difficulty } from "../types";
import { collectPageTags, matchesSelectedTags } from "../utils/tags";

export default function KnowledgePointsPage({ data }: { data: ModuleData }) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [diff, setDiff] = useState<Difficulty | "all">("all");
  const [keyword, setKeyword] = useState("");

  const { hash } = useLocation();
  const targetId = hash.slice(1);
  const archived = data.drafts.glossary.find((item) => `glossary-${item.id}` === targetId);
  const glossary = archived ? [...data.glossary, archived] : data.glossary;
  useEffect(() => {
    if (!targetId) return;
    const target = document.getElementById(targetId);
    target?.scrollIntoView({ block: "start" });
  }, [targetId]);

  const pageTags = useMemo(
    () => collectPageTags(data.tags, data.knowledgePoints.map((k) => k.tags || [])),
    [data.tags, data.knowledgePoints]
  );

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return data.knowledgePoints
      .filter((k) => diff === "all" || k.difficulty === diff)
      .filter((k) => matchesSelectedTags(k.tags || [], selectedTags, pageTags))
      .filter((k) =>
        kw ? `${k.title} ${k.summary} ${k.tags.join(" ")}`.toLowerCase().includes(kw) : true
      );
  }, [data.knowledgePoints, diff, selectedTags, pageTags, keyword]);

  return (
    <div className="space-y-6">
      <header className="work-heading">
        <h1 className="text-2xl font-bold text-body">知识点库</h1>
        <p className="mt-1 text-sm text-muted">共 {data.knowledgePoints.length} 个知识点</p>
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
        placeholder="过滤知识点…"
        className="input"
      />

      {filtered.length === 0 ? (
        <p className="text-muted">没有匹配的知识点。</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((k) => (
            <KnowledgePointCard key={k.id} kp={k} />
          ))}
        </div>
      )}

      {glossary.length > 0 && (
        <section id="glossary">
          <h2 className="text-lg font-semibold text-body mb-3">术语表</h2>
          <div className="card divide-y divide-line">
            {glossary.map((g) => (
              <div key={g.id} id={`glossary-${g.id}`} className="scroll-mt-20 px-4 py-3">
                <p className="text-sm font-medium text-body">{g.term}{g.editorialStatus === "draft" && "（修订中）"}</p>
                {g.aliases && g.aliases.length > 0 && (
                  <p className="text-xs text-subtle">别名：{g.aliases.join("、")}</p>
                )}
                <p className="mt-1 text-sm text-muted">{g.definition}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
