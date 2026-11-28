// 轻量化安全 Markdown 渲染器：支持标题(H1-H4)、表格、GitHub 提示框([!NOTE]/[TIP]/[WARNING]/[IMPORTANT])、
// 段落、无序/有序列表、代码块与演练场、引用、分割线、行内代码、加粗、斜体与安全白名单链接
import React from "react";
import CodePlayground from "../components/CodePlayground";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Match code as a single token so operators inside it remain literal, including inside bold text.
const INLINE_TOKEN = /`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*((?:`[^`]+`|[^*`])+)\*\*|\*(?!\*)([^*]+)\*(?!\*)/g;

function inline(source: string, plain = false): string {
  const literal = plain ? (s: string) => s : escapeHtml;
  let result = "";
  let offset = 0;
  for (const match of source.matchAll(INLINE_TOKEN)) {
    const [token, code, label, url, bold, emphasis] = match;
    result += literal(source.slice(offset, match.index));
    if (code !== undefined) {
      result += plain ? code : `<code>${escapeHtml(code)}</code>`;
    } else {
      const content = inline(label ?? bold ?? emphasis, plain);
      if (plain) result += content;
      else if (url) result += `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="text-brand-600 dark:text-brand-300 hover:underline">${content}</a>`;
      else if (bold !== undefined) result += `<strong>${content}</strong>`;
      else result += `<em>${content}</em>`;
    }
    offset = match.index! + token.length;
  }
  return result + literal(source.slice(offset));
}

const HEADING_RE = /^(#{1,4})\s+(\S.*)$/;

export function markdownHeading(line: string, index: number) {
  const match = HEADING_RE.exec(line);
  if (!match) return null;
  const source = match[2];
  // Keep existing fragment identifiers when improving the visible heading text.
  const slug = source.replace(/[*_`]/g, "").trim().toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, "-");
  return { id: `heading-${index}-${slug}`, level: match[1].length, text: inline(source, true).trim(), source };
}

const CALLOUT_STYLES: Record<string, { label: string; cls: string }> = {
  NOTE: {
    label: "提示",
    cls: "border-sky-500/50 bg-sky-500/10 text-sky-900 dark:text-sky-100",
  },
  TIP: {
    label: "技巧",
    cls: "border-emerald-500/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
  },
  IMPORTANT: {
    label: "重点",
    cls: "border-indigo-500/50 bg-indigo-500/10 text-indigo-900 dark:text-indigo-100",
  },
  WARNING: {
    label: "注意",
    cls: "border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  },
  CAUTION: {
    label: "警告",
    cls: "border-rose-500/50 bg-rose-500/10 text-rose-900 dark:text-rose-100",
  },
};

function CodeBlockWithCopy({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3 rounded-xl overflow-hidden border border-line dark:border-white/[0.08]">
      <div className="flex items-center justify-between bg-[#161922] px-4 py-1.5 border-b border-slate-800 text-xs">
        <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          type="button"
          className="text-[10px] text-slate-200 hover:bg-slate-700 transition flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-slate-700"
        >
          {copied ? "✓ 已复制" : "复制"}
        </button>
      </div>
      <pre className="!my-0 !rounded-none">
        <code dangerouslySetInnerHTML={{ __html: escapeHtml(code) }} />
      </pre>
    </div>
  );
}

function isTableDivider(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

export function renderMarkdown(md: string, omitTitle?: string): React.ReactNode {
  if (!md) return null;
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  const push = (node: React.ReactNode) => blocks.push(<React.Fragment key={key++}>{node}</React.Fragment>);

  while (i < lines.length) {
    const line = lines[i];

    // 代码块 ``` 或 ~~~
    const fenceMatch = line.trim().match(/^(`{3,}|~{3,})([a-zA-Z0-9+#-]*)/);
    if (fenceMatch) {
      const fenceToken = fenceMatch[1];
      const fenceChar = fenceToken[0];
      const fenceLen = fenceToken.length;
      const lang = fenceMatch[2] || "";
      const buf: string[] = [];
      i++;
      while (i < lines.length) {
        const closeMatch = lines[i].trim().match(/^(`{3,}|~{3,})\s*$/);
        if (closeMatch && closeMatch[1][0] === fenceChar && closeMatch[1].length >= fenceLen) {
          break;
        }
        buf.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      const rawCode = buf.join("\n");
      push(
        <>
          <CodeBlockWithCopy code={rawCode} language={lang} />
          <CodePlayground initialCode={rawCode} language={lang} />
        </>
      );
      continue;
    }

    // 分割线 ---
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      push(<hr className="my-4 border-slate-200 dark:border-white/10" />);
      i++;
      continue;
    }

    // Markdown 表格
    if (line.includes("|") && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      const headers = splitTableRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      push(
        <div className="my-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-white/5">
                {headers.map((h, idx) => (
                  <th
                    key={idx}
                    className="px-3 py-2 text-left font-semibold border-b border-slate-200 dark:border-white/10"
                    dangerouslySetInnerHTML={{ __html: inline(h) }}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, rIdx) => (
                <tr key={rIdx} className="border-b last:border-b-0 border-line">
                  {headers.map((_, cIdx) => (
                    <td
                      key={cIdx}
                      className="px-3 py-2 align-top"
                      dangerouslySetInnerHTML={{ __html: inline(r[cIdx] || "") }}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // 标题 H1-H4
    const heading = markdownHeading(line, i);
    if (heading) {
      const { level, id: headingId } = heading;
      // A lesson already renders its title in the page heading.
      if (omitTitle === heading.text && level === 1 && !lines.slice(0, i).some((line) => line.trim())) {
        i++;
        continue;
      }
      const content = inline(heading.source);
      if (level <= 2) push(<h2 id={headingId} dangerouslySetInnerHTML={{ __html: content }} />);
      else if (level === 3) push(<h3 id={headingId} dangerouslySetInnerHTML={{ __html: content }} />);
      else push(<h4 id={headingId} className="text-sm font-semibold mt-4 mb-1" dangerouslySetInnerHTML={{ __html: content }} />);
      i++;
      continue;
    }

    // 引用与 GitHub 风格 Callout (> [!NOTE] 等)
    if (line.trim().startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      const first = buf[0]?.trim() || "";
      const calloutMatch = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i.exec(first);
      if (calloutMatch) {
        const kind = calloutMatch[1].toUpperCase();
        const cfg = CALLOUT_STYLES[kind] || CALLOUT_STYLES.NOTE;
        const body = [calloutMatch[2], ...buf.slice(1)].filter(Boolean).join(" ");
        push(
          <div className={`my-3 rounded-lg border-l-4 px-4 py-3 text-sm ${cfg.cls}`}>
            <div className="font-semibold mb-1">{cfg.label}</div>
            <div dangerouslySetInnerHTML={{ __html: inline(body) }} />
          </div>
        );
      } else {
        push(<blockquote dangerouslySetInnerHTML={{ __html: inline(buf.join(" ")) }} />);
      }
      continue;
    }

    // 无序列表
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      push(
        <ul>
          {items.map((it, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: inline(it) }} />
          ))}
        </ul>
      );
      continue;
    }

    // 有序列表
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      push(
        <ol>
          {items.map((it, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: inline(it) }} />
          ))}
        </ol>
      );
      continue;
    }

    // 空行
    if (line.trim() === "") {
      i++;
      continue;
    }

    // 段落（连续非空行）
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !HEADING_RE.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*([-*_])\1{2,}\s*$/.test(lines[i]) &&
      !lines[i].trim().startsWith(">") &&
      !/^(`{3,}|~{3,})/.test(lines[i].trim()) &&
      !(lines[i].includes("|") && i + 1 < lines.length && isTableDivider(lines[i + 1]))
    ) {
      buf.push(lines[i]);
      i++;
    }
    if (buf.length === 0) {
      buf.push(lines[i]);
      i++;
    }
    push(<p dangerouslySetInnerHTML={{ __html: inline(buf.join(" ")) }} />);
  }

  return <div className="prose-tight">{blocks}</div>;
}
