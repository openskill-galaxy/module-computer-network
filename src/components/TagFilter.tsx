import { useState } from "react";
import type { Tag } from "../types";

interface Props {
  tags: Tag[];
  selected: string[]; // canonical tag names (compatible with tag ids)
  onChange: (next: string[]) => void;
}

export default function TagFilter({ tags, selected, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [tagSearch, setTagSearch] = useState("");

  function toggle(tag: Tag) {
    const isSelected = selected.includes(tag.name) || selected.includes(tag.id);
    if (isSelected) {
      onChange(selected.filter((t) => t !== tag.name && t !== tag.id));
    } else {
      onChange([...selected, tag.name]);
    }
  }

  const filteredTags = tags.filter((t) =>
    tagSearch.trim() ? t.name.toLowerCase().includes(tagSearch.trim().toLowerCase()) : true
  );

  const displayTags = expanded || tagSearch.trim() ? filteredTags : filteredTags.slice(0, 12);

  return (
    <div className="space-y-2.5 card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-body flex items-center gap-1.5">
          标签筛选 ({tags.length})
        </span>
        {tags.length > 12 && (
          <div className="flex items-center gap-2">
            <input
              type="search"
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              placeholder="快速搜索标签…"
              aria-label="快速搜索标签"
              className="px-2.5 py-1 text-xs rounded-lg border border-line-strong bg-surface text-body placeholder:text-subtle focus:outline-none focus:border-accent w-32 sm:w-44"
            />
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-brand hover:underline font-semibold whitespace-nowrap"
            >
              {expanded ? "收起" : `展开全部 (${tags.length})`}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={() => onChange([])}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            selected.length === 0
              ? "bg-accent text-accent-fg shadow-sm"
              : "border border-line bg-surface-2 text-muted hover:text-body hover:border-line-strong"
          }`}
        >
          全部标签
        </button>
        {displayTags.map((t) => {
          const active = selected.includes(t.name) || selected.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                active
                  ? "bg-accent text-accent-fg shadow-sm"
                  : "border border-line bg-surface-2 text-muted hover:text-body hover:border-line-strong"
              }`}
              title={t.description}
            >
              {t.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
