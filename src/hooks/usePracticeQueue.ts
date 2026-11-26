import { useEffect, useMemo, useState } from "react";
import type { Question } from "../types";
import { useProgressStore } from "../store/useProgressStore";
import { hasPendingPracticeResults, practiceQueue } from "../utils/practiceReview";

export function usePracticeQueue(questions: Question[]) {
  const history = useProgressStore((state) => state.practiceHistory);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  return useMemo(() => ({ history, pending: hasPendingPracticeResults(), ...practiceQueue(questions, history, now) }), [questions, history, now]);
}
