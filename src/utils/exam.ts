import type { Exam, Question, ExamRecord } from "../types";
import { scoreExam } from "./scoring";
import { nowIso, STORAGE_PREFIX } from "./storage";

export interface ExamDraft {
  startedAt: string;
  current: number;
  answers: Record<string, string[]>;
}

export function examDraftKey(exam: Exam): string {
  return STORAGE_PREFIX + "exam-draft:" + exam.id;
}

export function readExamDraft(exam: Exam, questions: Question[]): ExamDraft {
  try {
    const draft = JSON.parse(sessionStorage.getItem(examDraftKey(exam)) || "null");
    if (draft && typeof draft.startedAt === "string" && Date.parse(draft.startedAt) <= Date.now()
        && typeof draft.answers === "object" && draft.answers && !Array.isArray(draft.answers)) {
      const answers: Record<string, string[]> = {};
      for (const q of questions) {
        const values: unknown = draft.answers[q.id];
        if (Array.isArray(values) && values.every((v) => typeof v === "string")) answers[q.id] = values;
      }
      const current = Number.isInteger(draft.current) && draft.current >= 0 && draft.current < questions.length
        ? draft.current : 0;
      return { startedAt: draft.startedAt, answers, current };
    }
  } catch {
    // Private browsing and unavailable storage still allow an in-memory exam.
  }
  return { startedAt: nowIso(), current: 0, answers: {} };
}

// 构造考试题目顺序（按 exam.questionIds）
export function getExamQuestions(exam: Exam, all: Question[]): Question[] {
  return exam.questionIds
    .map((id) => all.find((q) => q.id === id))
    .filter((q): q is Question => Boolean(q));
}

// 提交考试，生成 ExamRecord
export function finishExam(
  exam: Exam,
  questions: Question[],
  userAnswers: Record<string, string[]>,
  startedAt: string
): ExamRecord {
  const { score, passed, details } = scoreExam(questions, userAnswers, exam.passingScore);
  const start = Date.parse(startedAt);
  const finish = Math.min(Date.now(), start + exam.timeLimitMinutes * 60_000);
  const finishedAt = new Date(finish).toISOString();
  const durationSeconds = Math.max(0, Math.round((finish - start) / 1000));
  return {
    examId: exam.id,
    startedAt,
    finishedAt,
    score,
    passed,
    durationSeconds,
    details,
  };
}

// 格式化时长 mm:ss
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// 倒计时：剩余秒数
export function remainingSeconds(
  startedAt: string,
  timeLimitMinutes: number
): number {
  const elapsed = Math.floor(
    (Date.now() - new Date(startedAt).getTime()) / 1000
  );
  return Math.max(0, timeLimitMinutes * 60 - elapsed);
}
