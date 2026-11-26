import type { ReviewVersion } from "./externalReviewData";
import { feedbackArchive } from "./reviewExchange";
import type { Case } from "../types";
import { parseProgressData } from "./progressData";
import { STORAGE_PREFIX } from "./storage";

export type ReviewStatus = "pending" | "met" | "revise";

export interface CriterionReview {
  status: ReviewStatus;
  evidence: string;
}

export interface CaseWork {
  answer: string;
  reviewed: boolean;
  criteria?: Record<string, CriterionReview>;
  reviewVersions?: ReviewVersion[];
}

const blank: CaseWork = { answer: "", reviewed: false };
const statusLabels: Record<ReviewStatus, string> = { pending: "待评价", met: "已达到", revise: "需改进" };

export function readCaseWork(id: string): CaseWork {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + "case-work:" + id);
    return raw ? parseProgressData("case-work", raw) as CaseWork : blank;
  } catch {
    return blank;
  }
}

export function completedCriteria(item: Case, work: CaseWork): number {
  return (item.reviewRubric ?? []).filter(({ id }) => {
    const entry = work.criteria?.[id];
    return entry && entry.status !== "pending" && Boolean(entry.evidence.trim());
  }).length;
}

export function caseReviewed(item: Case, work: CaseWork): boolean {
  return work.reviewed && completedCriteria(item, work) === (item.reviewRubric?.length ?? 0);
}

export function hasCaseWork(work: CaseWork): boolean {
  return Boolean(work.answer || Object.keys(work.criteria ?? {}).length || work.reviewVersions?.length);
}

export function caseSubmission(item: Case, moduleTitle: string, work: CaseWork, includeFeedback: boolean): string {
  const sections = ["# " + item.title, moduleTitle, "## 训练任务\n\n" + item.tasksMarkdown,
    "## 我的作答\n\n" + (work.answer || "尚未填写")];
  const reviewedLabel = item.reviewRubric?.length ? "已逐项完成自评" : "已对照参考思路自评";
  sections.push("自评状态：" + (caseReviewed(item, work) ? reviewedLabel : "待自评"));
  for (const criterion of item.reviewRubric ?? []) {
    const entry = work.criteria?.[criterion.id];
    sections.push("### " + criterion.title, "评审标准：" + criterion.requirement,
      "自评判断：" + statusLabels[entry?.status ?? "pending"], "证据或差距：" + (entry?.evidence || "尚未填写"));
  }
  if (includeFeedback && work.reviewVersions?.some((entry) => entry.feedback.length)) {
    sections.push(feedbackArchive(work.reviewVersions));
  }
  return sections.join("\n\n") + "\n";
}
