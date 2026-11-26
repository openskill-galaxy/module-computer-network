import type { CaseCriterion } from "../types";
import { type CriterionReview, type ReviewStatus } from "../utils/caseWork";

interface Props {
  criteria: CaseCriterion[];
  entries: Record<string, CriterionReview>;
  completed: number;
  onChange: (id: string, entry: CriterionReview) => void;
}

export default function CaseRubric({ criteria, entries, completed, onChange }: Props) {
  return (
    <section className="space-y-3" aria-labelledby="case-rubric-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="case-rubric-heading" className="font-semibold text-body">逐项评阅</h3>
        <p className="text-sm text-muted" role="status">已记录 {completed} / {criteria.length} 项</p>
      </div>
      <p className="text-sm text-muted">逐项选择判断，并摘录作品中的证据或需要补充的部分。</p>
      {criteria.map((criterion) => {
        const review = entries[criterion.id] ?? { status: "pending", evidence: "" };
        return (
          <fieldset key={criterion.id} className="min-w-0 space-y-2 rounded-lg border border-line px-4 pb-4">
            <legend className="px-1 text-sm font-semibold text-body">{criterion.title}</legend>
            <p className="text-sm text-muted">{criterion.requirement}</p>
            <label className="block text-sm text-body">
              自评判断
              <select className="input mt-1 block w-full sm:w-auto" value={review.status}
                onChange={(event) => onChange(criterion.id, { ...review, status: event.target.value as ReviewStatus })}>
                <option value="pending">待评价</option>
                <option value="met">已达到</option>
                <option value="revise">需改进</option>
              </select>
            </label>
            <label className="block text-sm text-body">
              证据或差距
              <textarea className="input mt-1 block w-full resize-y" rows={2} value={review.evidence}
                onChange={(event) => onChange(criterion.id, { ...review, evidence: event.target.value })} />
            </label>
          </fieldset>
        );
      })}
    </section>
  );
}
