import { validReviewVersions } from "./externalReviewData";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isStringList(value: unknown): boolean {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

// Only validate keys with a known record format. Raw notes and settings are strings.
export function parseProgressData(kind: string, raw: string): unknown {
  const value: unknown = JSON.parse(raw);
  let valid: boolean;
  switch (kind.startsWith("practice-result:") ? "practice-result" : kind) {
    case "practice-result":
      valid = isRecord(value) && typeof value.correct === "boolean" &&
        typeof value.lastAt === "string" && Number.isFinite(Date.parse(value.lastAt)) &&
        typeof value.nextReviewDate === "string" && Number.isFinite(Date.parse(value.nextReviewDate)) &&
        typeof value.interval === "number" && Number.isInteger(value.interval) && value.interval >= 1 && value.interval <= 365 &&
        typeof value.repetitions === "number" && Number.isSafeInteger(value.repetitions) && value.repetitions >= 0 &&
        typeof value.easeFactor === "number" && Number.isFinite(value.easeFactor) && value.easeFactor >= 1.3 && value.easeFactor <= 4;
      break;
    case "last-lesson":
      valid = isRecord(value) && typeof value.lessonId === "string" && value.lessonId.length > 0 &&
        typeof value.visitedAt === "string" && Number.isFinite(Date.parse(value.visitedAt));
      break;
    case "case-work":
      valid = isRecord(value) && typeof value.answer === "string" && typeof value.reviewed === "boolean" &&
        (!value.reviewed || Boolean(value.answer.trim())) &&
        (value.reviewVersions === undefined || validReviewVersions(value.reviewVersions)) &&
        (value.criteria === undefined || (isRecord(value.criteria) && Object.values(value.criteria).every((entry) =>
          isRecord(entry) && typeof entry.status === "string" && ["pending", "met", "revise"].includes(entry.status) &&
          typeof entry.evidence === "string")));
      break;
    case "favorites":
      valid = Array.isArray(value) && value.every((r) => isRecord(r) && typeof r.id === "string" &&
        ["knowledge", "lesson", "case", "question"].includes(String(r.type)) && typeof r.addedAt === "string");
      break;
    case "progress":
      valid = isRecord(value) && Object.values(value).every((r) => isRecord(r) &&
        ["not-started", "in-progress", "completed"].includes(String(r.status)));
      break;
    case "wrongs":
      valid = isRecord(value) && Object.values(value).every((r) => isRecord(r) &&
        typeof r.questionId === "string" && typeof r.lastAt === "string" && typeof r.wrongCount === "number");
      break;
    case "exams":
      valid = Array.isArray(value) && value.every((r) => isRecord(r) && typeof r.examId === "string" &&
        typeof r.startedAt === "string" && typeof r.finishedAt === "string" &&
        typeof r.score === "number" && typeof r.durationSeconds === "number" && typeof r.passed === "boolean" &&
        Array.isArray(r.details) && r.details.every((d) => isRecord(d) && typeof d.questionId === "string" &&
          typeof d.correct === "boolean" && isStringList(d.userAnswer)));
      break;
    case "active-dates":
      valid = isRecord(value) && Object.values(value).every((count) => typeof count === "number" && count >= 0);
      break;
    default:
      return value;
  }
  if (!valid) throw new Error(`学习记录格式无效（${kind}）`);
  return value;
}

export function validateBackupRecord(key: string, value: string): void {
  if (/^osg:[^:]+:practice-result:.+$/.test(key)) parseProgressData("practice-result", value);
  if (/^osg:[^:]+:case-work:.+$/.test(key)) parseProgressData("case-work", value);
  const match = /^(?:osg:[^:]+:|osg-mt:)(progress|favorites|wrongs|exams|active-dates|last-lesson)$/.exec(key);
  if (match) parseProgressData(match[1], value);
  if (key === "openskill-active-dates") parseProgressData("active-dates", value);
}
