import { useEffect, useState } from "react";

export interface TOCItem {
  id: string;
  level: number;
  text: string;
}

interface Props {
  content: string;
  omitTitle?: string;
}

export function parseHeadings(markdown: string): TOCItem[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const items: TOCItem[] = [];
  let inFence = false;
  let fenceChar = "";
  let fenceLen = 0;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!inFence) {
      const openMatch = trimmed.match(/^(`{3,}|~{3,})/);
      if (openMatch) {
        inFence = true;
        fenceChar = openMatch[1][0];
        fenceLen = openMatch[1].length;
        return;
      }
    } else {
      const closeMatch = trimmed.match(/^(`{3,}|~{3,})\s*$/);
      if (closeMatch && closeMatch[1][0] === fenceChar && closeMatch[1].length >= fenceLen) {
        inFence = false;
        fenceChar = "";
        fenceLen = 0;
      }
      return;
    }

    const match = line.match(/^(#{1,4})\s+(\S.*)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/[*_`]/g, "").trim();
      const id = `heading-${index}-${text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, "-")}`;
      items.push({ id, level, text });
    }
  });
  return items;
}

export default function LessonTOC({ content, omitTitle }: Props) {
  const [headings, setHeadings] = useState<TOCItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const items = parseHeadings(content);
    const firstLine = content.replace(/^\s+/, "").split(/\r?\n/, 1)[0];
    const duplicate = firstLine.startsWith("# ") && items[0]?.text === omitTitle;
    setHeadings(duplicate ? items.slice(1) : items);
  }, [content, omitTitle]);

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );

    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  function scrollToHeading(id: string) {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90;
      if (window.matchMedia("(max-width: 1023px)").matches) setOpen(false);
      window.requestAnimationFrame(() => {
        const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.tabIndex = -1;
        el.focus({ preventScroll: true });
        window.scrollTo({ top: y, behavior: reducedMotion ? "auto" : "smooth" });
      });
      setActiveId(id);
    }
  }

  return (
    <aside className="reader-toc print:hidden">
      <h2 className="reader-toc-title">讲义目录导航</h2>
      <button type="button" className="reader-toc-toggle" aria-expanded={open} aria-controls="reader-headings"
        onClick={() => setOpen((value) => !value)}>
        本讲目录 <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      <nav id="reader-headings" aria-label="讲义目录导航" data-expanded={open}>
        {headings.map((h) => {
          const isActive = activeId === h.id;
          const indentClass =
            h.level === 1
              ? "font-semibold pl-0 text-body"
              : h.level === 2
              ? "pl-2.5 text-muted"
              : h.level === 3
              ? "pl-5 text-subtle"
              : "pl-7 text-subtle text-[11px]";
          return (
            <button
              key={h.id}
              onClick={() => scrollToHeading(h.id)}
              type="button"
              className={`w-full text-left text-xs leading-relaxed transition duration-200 block py-1.5 rounded-md ${indentClass} ${
                isActive
                  ? "text-brand font-semibold bg-accent-soft border-l-2 border-accent pl-2"
                  : "hover:text-body hover:bg-surface-2"
              }`}
              aria-current={isActive ? "location" : undefined}
              title={h.text}
            >
              {h.text}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
