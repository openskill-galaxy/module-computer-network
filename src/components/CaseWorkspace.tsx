import ExternalCaseReview from "./ExternalCaseReview";
import { useEffect, useState } from "react";
import type { Case } from "../types";
import { downloadTextFile } from "../utils/download";
import { renderMarkdown } from "../utils/markdown";
import { caseReviewed, caseSubmission, completedCriteria, hasCaseWork, readCaseWork, type CaseWork, type CriterionReview } from "../utils/caseWork";
import CaseRubric from "./CaseRubric";
import { STORAGE_PREFIX } from "../utils/storage";

export default function CaseWorkspace({ item, moduleTitle, moduleSlug }: { item: Case; moduleTitle: string; moduleSlug: string }) {
  const key = STORAGE_PREFIX + "case-work:" + item.id;
  const [work, setWork] = useState(() => readCaseWork(item.id));
  const [unsaved, setUnsaved] = useState(false);
  const [includeFeedback, setIncludeFeedback] = useState(false);
  const hasFeedback = work.reviewVersions?.some((version) => version.feedback.length);
  const [referenceOpened, setReferenceOpened] = useState(work.reviewed);
  const criteria = item.reviewRubric ?? [];
  const completed = completedCriteria(item, work);
  const reviewed = caseReviewed(item, work);

  useEffect(() => {
    function restore(event: StorageEvent) {
      if ((event.key === key || event.key === null) && !unsaved) setWork(readCaseWork(item.id));
    }
    window.addEventListener("storage", restore);
    return () => window.removeEventListener("storage", restore);
  }, [key, item.id, unsaved]);

  function save(update: (previous: CaseWork) => CaseWork) {
    const previous = unsaved ? work : readCaseWork(item.id);
    const next = update(previous);
    setWork(next);
    try {
      if (!hasCaseWork(next)) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(next));
      setUnsaved(false);
      return true;
    } catch {
      setUnsaved(true);
      return false;
    }
  }

  function saveCriterion(id: string, value: CriterionReview) {
    save((previous) => {
      const entries = { ...previous.criteria, [id]: value };
      if (value.status === "pending" && value.evidence === "") delete entries[id];
      return { ...previous, criteria: entries, reviewed: false };
    });
  }

  function exportWork() {
    downloadTextFile(item.slug + "-work.md", caseSubmission(item, moduleTitle, work, includeFeedback), "text/markdown;charset=utf-8");
  }

  return (
    <section className="case-workspace space-y-4" aria-labelledby="case-work-heading">
      <h2 id="case-work-heading" className="text-lg font-semibold text-body">我的作品</h2>
      <div className="case-draft card space-y-3 p-4 sm:p-6">
        <label htmlFor="case-response" className="block text-sm font-semibold text-body">我的作答</label>
        <textarea id="case-response" value={work.answer} rows={6}
          className="input w-full resize-y leading-relaxed" aria-describedby="case-save-status"
          placeholder="写下你的做法、结果和验证过程，也可以附上作品链接。"
          onChange={(event) => save((previous) => ({ ...previous, answer: event.target.value, reviewed: false }))} />
        {hasFeedback && (
          <label className="flex items-center gap-2 text-sm text-body">
            <input type="checkbox" checked={includeFeedback} onChange={(event) => setIncludeFeedback(event.target.checked)} />
            作品导出时附上外部评语及对应送审原稿
          </label>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p id="case-save-status" role="status" className="text-xs text-muted">
            {unsaved ? "本次修改未能保存到浏览器。离开前请导出作品。" :
              hasCaseWork(work) ? "已保存到此浏览器" : "作答会自动保存到此浏览器"}
          </p>
          <button type="button" className="btn-ghost text-sm disabled:opacity-50"
            disabled={!work.answer.trim() && !Object.keys(work.criteria ?? {}).length && !(includeFeedback && hasFeedback)} onClick={() => exportWork()}>导出作品（Markdown）</button>
        </div>
      </div>
      <details className="card p-4" onToggle={(event) => {
        if (event.currentTarget.open) setReferenceOpened(true);
      }}>
        <summary className="cursor-pointer text-sm font-medium text-body">查看参考思路</summary>
        <div className="mt-3">{renderMarkdown(item.referenceMarkdown)}</div>
      </details>
      {criteria.length > 0 && (
        <CaseRubric criteria={criteria} entries={work.criteria ?? {}} completed={completed} onChange={saveCriterion} />
      )}
      {(criteria.length > 0 || (work.answer.trim() && (referenceOpened || reviewed))) && (
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-body">
          <input type="checkbox" checked={reviewed} disabled={!work.answer.trim() || completed < criteria.length}
            onChange={(event) => save((previous) => ({ ...previous, reviewed: event.target.checked }))} />
          {criteria.length > 0 ? "我已逐项完成自评" : "我已对照参考思路完成自评"}
        </label>
      )}
      <ExternalCaseReview item={item} moduleSlug={moduleSlug} moduleTitle={moduleTitle} work={work} save={save} />
    </section>
  );
}
