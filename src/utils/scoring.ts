import type { Question, QuestionType, ExamDetailItem } from "../types";

const TEXT_QUESTION_TYPES = new Set<QuestionType>([
  "short",
  "fill",
  "calculation",
  "case_analysis",
  "code",
  "reading",
]);

const SUBSTRING_MATCH_TYPES = new Set<QuestionType>([
  "short",
  "case_analysis",
  "code",
  "reading",
]);

export function isTextQuestion(q: Pick<Question, "type" | "options">): boolean {
  return TEXT_QUESTION_TYPES.has(q.type) && (!q.options || q.options.length === 0);
}

// 比较用户答案与正确答案（选项键忽略顺序）
export function isAnswerCorrect(q: Question, userAnswer: string[]): boolean {
  const norm = (arr: string[]) =>
    arr
      .map((s) => s.trim())
      .filter(Boolean)
      .sort()
      .join("|");
  if (isTextQuestion(q)) {
    // 文本/主观/填空/计算类：任一正确答案匹配即对（answer 中可含多个候选，用 | 分隔）
    const candidates = q.answer
      .join("|")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    const ua = userAnswer.join("").trim().toLowerCase();
    if (!ua) return false;
    if (SUBSTRING_MATCH_TYPES.has(q.type)) {
      return candidates.some((c) => {
        const lc = c.toLowerCase();
        if (ua === lc) return true;
        if (/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(lc)) return false;
        const escaped = lc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const start = /^[a-z0-9_]/.test(lc) ? "(?:^|[^a-z0-9_])" : "";
        const end = /[a-z0-9_]$/.test(lc) ? "(?:$|[^a-z0-9_])" : "";
        return new RegExp(start + escaped + end).test(ua);
      });
    }
    return candidates.some((c) => ua === c.toLowerCase());
  }
  const expected = norm(q.answer);
  const actual = norm(userAnswer);
  if (!expected || !actual) return false;
  return expected === actual;
}

// 单题得分权重（按难度）
export function questionWeight(q: Question): number {
  switch (q.difficulty) {
    case "easy":
      return 1;
    case "medium":
      return 2;
    case "hard":
      return 3;
  }
}

// 计算考试详情：每题对错 + 总分（0-100）+ 是否通过
export function scoreExam(
  questions: Question[],
  userAnswers: Record<string, string[]>,
  passingScore: number
): {
  score: number;
  passed: boolean;
  details: ExamDetailItem[];
} {
  const details: ExamDetailItem[] = questions.map((q) => {
    const ua = userAnswers[q.id] || [];
    const correct = isAnswerCorrect(q, ua);
    return { questionId: q.id, userAnswer: ua, correct };
  });

  const totalWeight = questions.reduce((s, q) => s + questionWeight(q), 0);
  const gotWeight = questions.reduce(
    (s, q, index) => s + (details[index].correct ? questionWeight(q) : 0),
    0
  );
  const score = totalWeight === 0 ? 0 : Math.round((gotWeight / totalWeight) * 100);
  return { score, passed: score >= passingScore, details };
}

export function difficultyLabel(d: Question["difficulty"]): string {
  return d === "easy" ? "简单" : d === "medium" ? "中等" : "困难";
}

const TYPE_LABELS: Record<QuestionType, string> = {
  single: "单选",
  multiple: "多选",
  judge: "判断",
  short: "简答",
  fill: "填空",
  calculation: "计算",
  case_analysis: "案例分析",
  code: "代码",
  reading: "阅读理解",
};

export function typeLabel(t: QuestionType): string {
  return TYPE_LABELS[t] || "简答";
}
