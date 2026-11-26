import type { PracticeResult } from "../utils/practiceReview";
import { Link } from "react-router-dom";
import type { Question } from "../types";
import DifficultyBadge from "./DifficultyBadge";
import { typeLabel } from "../utils/scoring";

export default function QuestionCard({
  question,
  to,
  result,
}: {
  question: Question;
  to?: string;
  result?: PracticeResult;
}) {
  const href = to || `/questions/${question.slug}`;
  return (
    <Link to={href} className="card-hover block p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 text-xs text-brand-600 dark:text-brand-300 font-semibold">
            {typeLabel(question.type)}
          </span>
          <DifficultyBadge difficulty={question.difficulty} />
        </div>
      </div>
      {result && <p className="mt-2 text-xs text-muted">{result.correct ? "上次答对" : "上次答错"} · {new Date(result.lastAt).toLocaleDateString("zh-CN")}</p>}
      <p className="mt-2 text-sm font-semibold text-body line-clamp-3 leading-relaxed">{question.stem}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {question.tags.slice(0, 3).map((t) => (
          <span key={t} className="tag text-[10px]">{t}</span>
        ))}
      </div>
    </Link>
  );
}
