import type { Course, ExamRecord, Question, WrongQuestionRecord } from "../types";
import { calculateSM2 } from "./srs";
import { parseProgressData } from "./progressData";
import { STORAGE_PREFIX, readJson, writeJson } from "./storage";

export interface PracticeResult {
  correct: boolean;
  lastAt: string;
  nextReviewDate: string;
  interval: number;
  repetitions: number;
  easeFactor: number;
}
export type PracticeHistory = Record<string, PracticeResult>;
export const resultPrefix = "practice-result:";
const unsaved = new Map<string, PracticeResult>();

export function hasPendingPracticeResults() { return unsaved.size > 0; }
export function clearPendingPracticeResults() { unsaved.clear(); }

function schedule(previous: PracticeResult | undefined, correct: boolean, at: string): PracticeResult {
  // An immediate retry updates the latest answer but cannot extend its review interval.
  if (correct && previous && Date.parse(at) < Date.parse(previous.nextReviewDate)) {
    return { ...previous, correct, lastAt: at };
  }
  const { interval, repetitions, easeFactor, nextReviewDate } = calculateSM2(
    correct ? 4 : 1, previous?.interval, previous?.repetitions, previous?.easeFactor, new Date(at)
  );
  return { correct, lastAt: at, interval, repetitions, easeFactor, nextReviewDate };
}

export function recordPracticeResult(history: PracticeHistory, id: string, correct: boolean, at: string) {
  const key = resultPrefix + id;
  const persisted = readJson<PracticeResult | undefined>(key, undefined);
  let previous = history[id];
  if (persisted && (!previous || Date.parse(persisted.lastAt) >= Date.parse(previous.lastAt))) previous = persisted;
  if (previous && Date.parse(at) < Date.parse(previous.lastAt)) return previous;
  const result = schedule(previous, correct, at);
  unsaved.set(id, result);
  for (const [pendingId, pending] of unsaved) {
    const recent = readJson<PracticeResult | undefined>(resultPrefix + pendingId, undefined);
    if ((recent && Date.parse(recent.lastAt) > Date.parse(pending.lastAt)) || writeJson(resultPrefix + pendingId, pending)) {
      unsaved.delete(pendingId);
    }
  }
  return result;
}

export function readPracticeHistory(exams: ExamRecord[], wrongs: Record<string, WrongQuestionRecord>): PracticeHistory {
  const history: PracticeHistory = Object.create(null);
  // Older versions kept graded exams and mistakes, but no record of a standalone correct answer.
  for (const exam of [...exams].sort((a, b) => Date.parse(a.finishedAt) - Date.parse(b.finishedAt))) {
    if (!Number.isFinite(Date.parse(exam.finishedAt))) continue;
    for (const item of exam.details) {
      if (item.userAnswer.some((value) => value.trim())) {
        history[item.questionId] = schedule(history[item.questionId], item.correct, exam.finishedAt);
      }
    }
  }
  for (const item of Object.values(wrongs)) {
    const prev = history[item.questionId];
    if (!Number.isFinite(Date.parse(item.lastAt)) || (prev && Date.parse(prev.lastAt) >= Date.parse(item.lastAt))) continue;
    const inferred = schedule(undefined, (item.repetitions ?? 0) > 0, item.lastAt);
    // A legacy mistake without a scheduled follow-up was immediately available for review.
    history[item.questionId] = { ...inferred, nextReviewDate: item.nextReviewDate && Number.isFinite(Date.parse(item.nextReviewDate))
      ? item.nextReviewDate : item.lastAt };
  }
  try {
    const prefix = STORAGE_PREFIX + resultPrefix;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      const id = key.slice(prefix.length);
      const raw = localStorage.getItem(key);
      if (!id || !raw) continue;
      try {
        const result = parseProgressData("practice-result", raw) as PracticeResult;
        if (!history[id] || Date.parse(result.lastAt) >= Date.parse(history[id].lastAt)) history[id] = result;
      } catch { /* Ignore one damaged entry without losing the other questions. */ }
    }
  } catch { /* Exam and mistake history are still usable. */ }
  for (const [id, result] of unsaved) {
    if (!history[id] || Date.parse(result.lastAt) >= Date.parse(history[id].lastAt)) history[id] = result;
  }
  return history;
}

// The catalog accepts a course ID or one of its lesson IDs as the question chapter.
export function inPracticeCourse(question: Question, course: Course) {
  return question.chapter === course.id || course.lessons.includes(question.chapter);
}

export function practiceUrl(slug: string, mode: "new" | "due", chapter: string, fromWrongBook = false) {
  const query = new URLSearchParams({ queue: mode });
  if (chapter) query.set("chapter", chapter);
  if (fromWrongBook) query.set("from", "wrong");
  return `/practice/${encodeURIComponent(slug)}?${query}`;
}

export function practiceQueue(questions: Question[], history: PracticeHistory, now: number) {
  const due: Question[] = [];
  const fresh: Question[] = [];
  const answeredByChapter = new Map<string, number>();
  let incorrect = 0;
  let nextAt = Infinity;
  for (const q of questions) {
    const record = history[q.id];
    if (!record) { fresh.push(q); continue; }
    answeredByChapter.set(q.chapter, (answeredByChapter.get(q.chapter) ?? 0) + 1);
    if (!record.correct) incorrect++;
    const deadline = Date.parse(record.nextReviewDate);
    if (deadline <= now) due.push(q);
    else nextAt = Math.min(nextAt, deadline);
  }
  due.sort((a, b) => Date.parse(history[a.id].nextReviewDate) - Date.parse(history[b.id].nextReviewDate));
  fresh.sort((a, b) => (answeredByChapter.get(a.chapter) ?? 0) - (answeredByChapter.get(b.chapter) ?? 0));
  return { due, fresh, incorrect, nextAt, answered: questions.length - fresh.length };
}
