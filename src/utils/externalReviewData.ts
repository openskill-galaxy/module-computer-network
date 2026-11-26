export interface ExternalFeedback {
  receivedAt: string;
  name: string;
  summary: string;
  comments: Record<string, string>;
}

export interface ReviewVersion {
  id: string;
  createdAt: string;
  answer: string;
  rubric: { id: string; title: string; requirement: string }[];
  feedback: ExternalFeedback[];
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validDate(value: unknown): boolean {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function validReviewVersions(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  return value.every((version) => {
    if (!record(version) || typeof version.id !== "string" || !/^[0-9a-f]{24}$/.test(version.id) ||
        ids.has(version.id) || !validDate(version.createdAt) || typeof version.answer !== "string" ||
        !version.answer.trim() || !Array.isArray(version.rubric) || !Array.isArray(version.feedback)) return false;
    ids.add(version.id);
    const criteria = new Set<string>();
    for (const entry of version.rubric) {
      if (!record(entry) || typeof entry.id !== "string" || !/^[a-z][a-z0-9-]*$/.test(entry.id) ||
          criteria.has(entry.id) || typeof entry.title !== "string" || typeof entry.requirement !== "string") return false;
      criteria.add(entry.id);
    }
    return version.feedback.every((review: unknown) => record(review) && validDate(review.receivedAt) &&
      typeof review.name === "string" && typeof review.summary === "string" && record(review.comments) &&
      Object.entries(review.comments).every(([id, comment]) => criteria.has(id) && typeof comment === "string" && comment.trim()) &&
      (review.summary.trim() !== "" || Object.keys(review.comments).length > 0));
  });
}
