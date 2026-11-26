import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SearchResult } from "../types";
import { buildSearchEntries, createFuse, runSearch, typeLabel } from "../search/search";
import type { ModuleData } from "../data/loaders";
import { IconSearch } from "./icons";

let cachedData: ModuleData | null = null;
let cachedFuse: ReturnType<typeof createFuse> | null = null;

export default function SearchBox({ data }: { data: ModuleData }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => query.trim() ? runSearch(ensureIndex(data), query, 8) : [], [data, query]);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const navigate = useNavigate();
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    function handleShortcut(e: KeyboardEvent) {
      if (e.defaultPrevented || document.querySelector('[aria-modal="true"]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  // 聚焦时用 App 已加载的数据预构建索引（避免重复 fetch 全量 JSON）
  function handleFocus() {
    ensureIndex(data);
    if (query.trim().length > 0) setOpen(true);
  }

  function go(r: SearchResult) {
    setQuery("");
    setOpen(false);
    navigate(r.url);
  }

  const typeColor: Record<SearchResult["type"], string> = {
    course: "bg-accent-soft text-brand",
    lesson: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    knowledge: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
    question: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    case: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    route: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    faq: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    glossary: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  };

  const dropdownClass =
    "fixed inset-x-4 top-[4.5rem] z-40 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[400px] sm:max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-surface backdrop-blur-xl shadow-[var(--shadow-lg)] overflow-hidden";

  return (
    <div ref={boxRef} className="relative">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onFocus={handleFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(Boolean(e.target.value.trim()));
            setSelectedIndex(-1);
          }}
          onBlur={() => {
            setOpen(false);
            setSelectedIndex(-1);
          }}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
              setSelectedIndex(-1);

            } else if (results.length > 0 && e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setSelectedIndex((prev) => (prev + 1 < results.length ? prev + 1 : 0));
            } else if (results.length > 0 && e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
              setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : results.length - 1));
            } else if (open && results.length > 0 && e.key === "Enter") {
              e.preventDefault();
              go(results[selectedIndex >= 0 ? selectedIndex : 0]);
            }
          }}
          placeholder="搜索"
          className="input pl-9 pr-3 lg:pr-14 py-2 text-base sm:text-sm"
          aria-label="全站搜索"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && results.length > 0}
          aria-controls={open && results.length ? "module-search-results" : undefined}
          aria-activedescendant={open && results[selectedIndex] ? `module-result-${selectedIndex}` : undefined}
        />
        <span className="absolute left-3 text-subtle pointer-events-none">
          <IconSearch size={15} />
        </span>
        <span className="hidden lg:inline absolute right-2.5 text-[10px] font-medium text-subtle border border-line rounded px-1.5 py-0.5 pointer-events-none select-none">
          {/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘ K" : "Ctrl+K"}
        </span>
      </div>
      {open && results.length > 0 && (
        <ul
          id="module-search-results"
          role="listbox"
          aria-label="搜索匹配结果"
          className={`${dropdownClass} p-1.5 space-y-0.5 max-h-[70vh] overflow-y-auto`}
        >
          {results.map((r, idx) => (
            <li key={`${r.type}-${r.id}`} id={`module-result-${idx}`} role="option" aria-selected={selectedIndex === idx}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(r)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex w-full items-start gap-3 rounded-xl px-3.5 py-2.5 text-left active:scale-[0.99] transition-all duration-150 ${
                  selectedIndex === idx ? "bg-surface-2" : "hover:bg-surface-2"
                }`}
              >
                <span className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${typeColor[r.type] || "bg-accent-soft text-brand"}`}>
                  {typeLabel[r.type]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-body font-medium truncate">{r.title}</span>
                  <span className="block text-xs text-muted truncate mt-0.5">
                    {r.summary}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && results.length === 0 && (
        <div className={`${dropdownClass} p-4 text-xs text-muted`}>
          未找到匹配结果
        </div>
      )}
    </div>
  );
}

export function ensureIndex(data: ModuleData): ReturnType<typeof createFuse> {
  if (cachedData !== data || !cachedFuse) {
    const entries = buildSearchEntries({
      courses: data.courses,
      lessons: data.lessons,
      knowledgePoints: data.knowledgePoints,
      questions: data.questions,
      cases: data.cases,
      routes: data.routes,
      faqs: data.faqs,
      glossary: data.glossary,
    });
    cachedData = data;
    cachedFuse = createFuse(entries);
  }
  return cachedFuse;
}
