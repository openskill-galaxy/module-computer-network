import ContentFeedback from "../components/ContentFeedback";
import { Link, useParams } from "react-router-dom";
import type { ModuleData } from "../data/loaders";
import { renderMarkdown } from "../utils/markdown";
import CaseWorkspace from "../components/CaseWorkspace";
import DifficultyBadge from "../components/DifficultyBadge";
import { useProgressStore } from "../store/useProgressStore";
import { useSEO } from "../hooks/useSEO";

export default function CaseDetailPage({ data }: { data: ModuleData }) {
  const { slug } = useParams<{ slug: string }>();
  const toggleFavorite = useProgressStore((s) => s.toggleFavorite);
  const favorites = useProgressStore((s) => s.favorites);

  const c = data.cases.find((x) => x.slug === slug) ?? data.drafts.cases.find((x) => x.slug === slug);

  useSEO({
    title: c ? `${c.title} · ${data.module.title}` : data.module.title,
  });

  if (!c) {
    return (
      <div className="space-y-4">
        <p className="text-muted">未找到案例：{slug}</p>
        <Link className="btn-ghost" to="/cases">返回案例列表</Link>
      </div>
    );
  }

  const previous = data.cases.find((candidate) => candidate.nextCaseId === c.id);
  const next = c.nextCaseId && data.cases.find((candidate) => candidate.id === c.nextCaseId);
  const kps = c.knowledgePoints.map((id) => data.knowledgePoints.find((k) => k.id === id)).filter(Boolean);

  return (
    <article className="space-y-8">
      <nav className="text-sm text-subtle">
        <Link to="/" className="hover:text-body">首页</Link>
        <span className="mx-2">/</span>
        <Link to="/cases" className="hover:text-body">案例</Link>
        <span className="mx-2">/</span>
        <span className="text-body">{c.title}</span>
      </nav>

      <header className="work-heading space-y-3">
        {c.editorialStatus === "draft" && <p className="text-sm text-muted">此条目正在修订，保留原链接供查阅。</p>}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <DifficultyBadge difficulty={c.difficulty} />
            {c.tags.map((t) => <span key={t} className="tag">{t}</span>)}
          </div>
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => toggleFavorite({ type: "case", id: c.id })}
          >
            {favorites.some((f) => f.type === "case" && f.id === c.id) ? "★ 已收藏" : "☆ 收藏"}
          </button>
        </div>
        <h1 className="text-2xl font-bold text-body">{c.title}</h1>
        <p className="text-muted">{c.summary}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-sm text-subtle">约 {c.estimatedMinutes} 分钟</span>
          <ContentFeedback module={data.module} item={{ section: "cases", id: c.id, slug: c.slug, title: c.title }} />
        </div>
      </header>

      <section>
        <h2 className="text-lg font-semibold text-body mb-2">案例背景</h2>
        <div className="card p-6">{renderMarkdown(c.backgroundMarkdown)}</div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-body mb-2">训练任务</h2>
        <div className="card p-6">{renderMarkdown(c.tasksMarkdown)}</div>
      </section>

      {c.editorialStatus === "draft" ? (
        <details className="card p-4">
          <summary className="cursor-pointer text-sm font-medium text-body">查看参考思路</summary>
          <div className="mt-3">{renderMarkdown(c.referenceMarkdown)}</div>
        </details>
      ) : (
        <CaseWorkspace key={c.id} item={c} moduleTitle={data.module.title} moduleSlug={data.module.slug} />
      )}

      {(previous || next) && (
        <nav aria-label="连续项目" className="flex flex-wrap justify-between gap-3 border-t border-line pt-4 text-sm">
          {previous && <Link className="text-brand hover:underline" to={`/cases/${previous.slug}`}>上一阶段 · {previous.title}</Link>}
          {next && <Link className="text-brand hover:underline" to={`/cases/${next.slug}`}>下一阶段 · {next.title}</Link>}
        </nav>
      )}

      {kps.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-body mb-3">相关知识点</h2>
          <div className="flex flex-wrap gap-2">
            {kps.map((kp) => (
              <Link key={kp!.id} to={`/knowledge/${kp!.slug}`} className="tag hover:bg-brand-500/30 transition">
                {kp!.title}
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
