import { clearPendingPracticeResults, readPracticeHistory, recordPracticeResult, type PracticeHistory, type PracticeResult } from "../utils/practiceReview";
import { create } from "zustand";
import type {
  ProgressRecord,
  FavoriteRecord,
  WrongQuestionRecord,
  ExamRecord,
  Lesson,
} from "../types";
import { readJson, writeJson, nowIso, clearAll } from "../utils/storage";

interface ProgressState {
  practiceHistory: PracticeHistory;
  progress: Record<string, ProgressRecord>;
  favorites: FavoriteRecord[];
  wrongs: Record<string, WrongQuestionRecord>;
  exams: ExamRecord[];

  setLessonStatus: (lessonId: string, status: ProgressRecord["status"]) => void;
  getLessonStatus: (lessonId: string) => ProgressRecord["status"];

  toggleFavorite: (rec: Omit<FavoriteRecord, "addedAt">) => void;
  isFavorite: (type: FavoriteRecord["type"], id: string) => boolean;

  recordAnswer: (questionId: string, userAnswer: string[], correct: boolean) => void;
  clearWrong: (questionId: string) => void;
  clearAllWrongs: () => void;

  addExam: (rec: ExamRecord) => void;

  resetAll: () => void;
  hydrate: () => void;
}

function updateWrongQuestion(
  wrongs: Record<string, WrongQuestionRecord>,
  questionId: string,
  userAnswer: string[],
  result: PracticeResult
) {
  const prev = wrongs[questionId];
  if (result.correct && !prev) return;
  if (result.correct && result.repetitions >= 3) {
    delete wrongs[questionId];
    return;
  }
  wrongs[questionId] = {
    questionId,
    wrongCount: (prev?.wrongCount ?? 0) + (result.correct ? 0 : 1),
    lastAnswer: userAnswer,
    lastAt: result.lastAt,
    interval: result.interval,
    repetitions: result.repetitions,
    easeFactor: result.easeFactor,
    nextReviewDate: result.nextReviewDate,
  };
}

const EMPTY: ProgressState = {
  practiceHistory: {},
  progress: {},
  favorites: [],
  wrongs: {},
  exams: [],
  setLessonStatus: () => {},
  getLessonStatus: () => "not-started",
  toggleFavorite: () => {},
  isFavorite: () => false,
  recordAnswer: () => {},
  clearWrong: () => {},
  clearAllWrongs: () => {},
  addExam: () => {},
  resetAll: () => {},
  hydrate: () => {},
};

export const useProgressStore = create<ProgressState>((set, get) => ({
  ...EMPTY,

  hydrate: () => {
    const wrongs = readJson<Record<string, WrongQuestionRecord>>("wrongs", {});
    const exams = readJson<ExamRecord[]>("exams", []);
    set({
      practiceHistory: readPracticeHistory(exams, wrongs),
      progress: readJson<Record<string, ProgressRecord>>("progress", {}),
      favorites: readJson<FavoriteRecord[]>("favorites", []),
      wrongs, exams,
    });
  },

  setLessonStatus: (lessonId, status) => {
    const progress = {
      ...get().progress,
      [lessonId]: { lessonId, status, updatedAt: nowIso() },
    };
    set({ progress });
    writeJson("progress", progress);
  },

  getLessonStatus: (lessonId) => {
    return get().progress[lessonId]?.status || "not-started";
  },

  toggleFavorite: (rec) => {
    const favorites = [...get().favorites];
    const idx = favorites.findIndex(
      (f) => f.type === rec.type && f.id === rec.id
    );
    if (idx >= 0) {
      favorites.splice(idx, 1);
    } else {
      favorites.push({ ...rec, addedAt: nowIso() });
    }
    set({ favorites });
    writeJson("favorites", favorites);
  },

  isFavorite: (type, id) => {
    return get().favorites.some((f) => f.type === type && f.id === id);
  },

  recordAnswer: (questionId, userAnswer, correct) => {
    const wrongs = { ...get().wrongs };
    if (!userAnswer.some((value) => value.trim())) return;
    const history = get().practiceHistory;
    const at = nowIso();
    const result = recordPracticeResult(history, questionId, correct, at);
    if (Date.parse(result.lastAt) > Date.parse(at)) return;
    updateWrongQuestion(wrongs, questionId, userAnswer, result);
    set({ wrongs, practiceHistory: { ...history, [questionId]: result } });
    writeJson("wrongs", wrongs);
  },

  clearWrong: (questionId) => {
    const wrongs = { ...get().wrongs };
    if (wrongs[questionId]) delete wrongs[questionId];
    set({ wrongs });
    writeJson("wrongs", wrongs);
  },

  clearAllWrongs: () => {
    set({ wrongs: {} });
    writeJson("wrongs", {});
  },

  addExam: (rec) => {
    const { exams: previous, wrongs: previousWrongs } = get();
    if (previous.some((r) => r.examId === rec.examId && r.startedAt === rec.startedAt)) return;
    const exams = [rec, ...previous];
    const practiceHistory = { ...get().practiceHistory };
    const wrongs = { ...previousWrongs };
    for (const detail of rec.details) {
      if (detail.userAnswer.some((value) => value.trim())) {
        const result = recordPracticeResult(practiceHistory, detail.questionId, detail.correct, rec.finishedAt);
        practiceHistory[detail.questionId] = result;
        if (Date.parse(result.lastAt) > Date.parse(rec.finishedAt)) continue;
        updateWrongQuestion(wrongs, detail.questionId, detail.userAnswer, result);
      }
    }
    set({ exams, wrongs, practiceHistory });
    writeJson("exams", exams);
    writeJson("wrongs", wrongs);
  },

  resetAll: () => {
    clearPendingPracticeResults();
    clearAll();
    set({
      practiceHistory: {},
      progress: {},
      favorites: [],
      wrongs: {},
      exams: [],
    });
  },
}));

// 计算课程进度（已完成讲义数 / 总讲义数）
export function courseProgress(
  course: { lessons: string[] },
  progress: Record<string, ProgressRecord>
): { completed: number; total: number; percent: number } {
  const total = course.lessons.length;
  const completed = course.lessons.filter(
    (lid) => progress[lid]?.status === "completed"
  ).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent };
}

// 全局讲义进度
export function lessonsOverall(
  lessons: Lesson[],
  progress: Record<string, ProgressRecord>
): { completed: number; total: number; percent: number } {
  const total = lessons.length;
  const completed = lessons.filter(
    (l) => progress[l.id]?.status === "completed"
  ).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent };
}
