import { useRef, useState } from "react";
import type { Case } from "../types";
import type { CaseWork } from "../utils/caseWork";
import { downloadTextFile } from "../utils/download";
import { createVersion, matchesVersion, readReturnedReview, reviewForm, sameFeedback } from "../utils/reviewExchange";

interface Props {
  item: Case;
  moduleSlug: string;
  moduleTitle: string;
  work: CaseWork;
  save: (update: (previous: CaseWork) => CaseWork) => boolean;
}

export default function ExternalCaseReview({ item, moduleSlug, moduleTitle, work, save }: Props) {
  const [message, setMessage] = useState("");
  const picker = useRef<HTMLInputElement>(null);
  const versions = work.reviewVersions ?? [];
  const returned = versions.filter((version) => version.feedback.length);

  function exportForm() {
    let version = versions.find((entry) => matchesVersion(entry, item, work.answer)) ?? createVersion(item, work.answer);
    const saved = save((previous) => {
      const previousVersions = previous.reviewVersions ?? [];
      const existing = previousVersions.find((entry) => matchesVersion(entry, item, work.answer));
      if (existing) {
        version = existing;
        return previous;
      }
      return { ...previous, reviewVersions: [...previousVersions, version] };
    });
    if (!saved) {
      setMessage("浏览器无法保存送审版本。请先导出作品，恢复存储空间后再导出可回收的评阅表。");
      return;
    }
    downloadTextFile(item.slug + "-review.md", reviewForm(item, moduleSlug, moduleTitle, version), "text/markdown;charset=utf-8");
    setMessage("已生成评阅表。请将文件交给评阅人，收回填写好的文件后在这里导入。");
  }

  async function importReview(file: File) {
    try {
      const text = await file.text();
      let repeated = false;
      const saved = save((previous) => {
        const previousVersions = previous.reviewVersions ?? [];
        const { versionId, review } = readReturnedReview(text, moduleSlug, item.id, previousVersions);
        const updated = previousVersions.map((version) => {
          if (version.id !== versionId) return version;
          repeated = version.feedback.some((entry) => sameFeedback(entry, review));
          return repeated ? version : { ...version, feedback: [...version.feedback, review] };
        });
        return { ...previous, reviewVersions: updated };
      });
      if (!saved) setMessage("反馈已在本页打开，浏览器未能保存。请保留收到的评阅文件。");
      else setMessage(repeated ? "相同反馈已保存在该送审版本中。" : "外部反馈已保存到对应送审版本。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "读取失败，请重新选择评阅文件。");
    }
  }

  return (
    <section aria-labelledby="external-case-heading" className="space-y-3 border-t border-line pt-4">
      <h3 id="external-case-heading" className="font-semibold text-body">他人评阅</h3>
      <p className="text-sm text-muted">{item.reviewRubric?.length ? "" : "本案例采用综合意见，可请评阅人指出优先修改的部分，并建议如何复查。"}将 Markdown 评阅表交给他人填写，再把收到的文件导入这里。评语与送审时的原稿一起保存在本浏览器，署名由评阅人填写。</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost text-sm disabled:opacity-50" disabled={!work.answer.trim()}
          onClick={exportForm}>导出独立评阅表（Markdown）</button>
        <button type="button" className="btn-ghost text-sm" onClick={() => picker.current?.click()}>导入已填写的评阅表</button>
        <input ref={picker} type="file" accept=".md,.markdown,text/markdown,text/plain" className="hidden"
          aria-label="已填写的评阅表文件" onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void importReview(file);
          }} />
      </div>
      {message && <p role="status" className="text-sm text-muted">{message}</p>}
      {returned.map((version) => (
        <details className="card p-4" key={version.id}>
          <summary className="cursor-pointer text-sm font-medium text-body">
            {matchesVersion(version, item, work.answer) ? "当前稿件" : "历史稿件"} · {version.feedback.length} 份反馈 · {version.id.slice(0, 8)}
          </summary>
          <div className="mt-3 space-y-3 text-sm">
            <p className="text-muted">送审于 {new Date(version.createdAt).toLocaleString()}</p>
            <details>
              <summary className="cursor-pointer">查看送审原稿</summary>
              <p className="mt-2 whitespace-pre-wrap break-words">{version.answer}</p>
            </details>
            {version.feedback.map((review, index) => (
              <section className="space-y-2 border-t border-line pt-3" key={index}>
                <h4 className="font-semibold text-body">{review.name || "匿名评阅人"}</h4>
                {version.rubric.filter((row) => review.comments[row.id]).map((row) => (
                  <div key={row.id}>
                    <p className="font-medium text-body">{row.title}</p>
                    <p className="whitespace-pre-wrap break-words text-muted">{review.comments[row.id]}</p>
                  </div>
                ))}
                {review.summary && <p className="whitespace-pre-wrap break-words text-body">{review.summary}</p>}
              </section>
            ))}
          </div>
        </details>
      ))}
    </section>
  );
}
