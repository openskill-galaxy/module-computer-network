import { useEffect, useId, useRef, useState } from "react";

export default function CodePlayground({
  initialCode,
  language,
}: {
  initialCode: string;
  language: string;
}) {
  const hintId = useId();
  const releaseTab = useRef(false);
  const [code, setCode] = useState(initialCode);
  const [showSandbox, setShowSandbox] = useState(false);
  // 沙箱内容走 srcDoc（sandbox="allow-scripts" 下无法访问 contentDocument）
  const [sandboxHtml, setSandboxHtml] = useState("");
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    releaseTab.current = false;
    setCode(initialCode);
    setShowSandbox(false);
    setSandboxHtml("");
  }, [initialCode, language]);

  const isExecutable =
    ["javascript", "js", "html"].includes(
      language.toLowerCase()
    );

  const runCode = () => {
    let htmlContent = "";
    const lang = language.toLowerCase();

    if (lang === "html") {
      htmlContent = code;
    } else {
      // Pass the source as a string so a syntax error cannot prevent the console from starting.
      const source = JSON.stringify(code).replace(/</g, "\\u003c");
      htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body {
                  font-family: system-ui, -apple-system, sans-serif;
                  background-color: #090a0f;
                  color: #e2e8f0;
                  padding: 16px;
                  margin: 0;
                  font-size: 13px;
                  line-height: 1.5;
                }
                h4 {
                  margin: 0 0 12px 0;
                  color: #94a3b8;
                  font-size: 11px;
                  text-transform: uppercase;
                  letter-spacing: 0.05em;
                  font-weight: 700;
                }
                pre {
                  background: #02040a;
                  padding: 12px;
                  border-radius: 8px;
                  color: #38bdf8;
                  font-family: SFMono-Regular, Consolas, Monaco, monospace;
                  margin: 0 0 8px 0;
                  border: 1px solid rgba(255, 255, 255, 0.08);
                  white-space: pre-wrap;
                  word-break: break-all;
                }
                .error {
                  color: #f43f5e;
                  border-color: rgba(244, 63, 94, 0.25);
                  background: rgba(244, 63, 94, 0.08);
                }
              </style>
            </head>
            <body>
              <h4>控制台输出 (Console Output)</h4>
              <div id="output"></div>
              <script>
                (() => {
                  const output = document.getElementById('output');
                  const write = (isError, args) => {
                    const line = document.createElement('pre');
                    if (isError) line.className = 'error';
                    line.textContent = args.map(value => {
                      if (value instanceof Error) return String(value);
                      if (value && typeof value === 'object') {
                        try { return JSON.stringify(value, null, 2); } catch {}
                      }
                      return String(value);
                    }).join(' ');
                    output.appendChild(line);
                  };
                  console.log = console.info = console.warn = (...args) => write(false, args);
                  console.error = (...args) => write(true, args);
                  const showError = (reason) => {
                    const kind = reason instanceof SyntaxError ? '语法错误' : '运行时错误';
                    console.error(kind + ': ' + (reason instanceof Error ? reason.message : String(reason)));
                  };
                  window.addEventListener('error', event => {
                    event.preventDefault();
                    const message = event.message === 'Script error.'
                      ? '回调执行失败，浏览器未提供详细信息' : event.message;
                    showError(event.error || message);
                  });
                  window.addEventListener('unhandledrejection', event => {
                    event.preventDefault();
                    showError(event.reason);
                  });
                  try {
                    (0, eval)(${source});
                  } catch (err) {
                    showError(err);
                  }
                })();
              </script>
            </body>
          </html>
        `;
    }

    setSandboxHtml(htmlContent);
    setRunId((n) => n + 1);
    setShowSandbox(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      releaseTab.current = true;
      return;
    }
    const indent = e.key === "Tab" && !releaseTab.current && !e.shiftKey &&
      !e.ctrlKey && !e.altKey && !e.metaKey;
    releaseTab.current = false;
    if (!indent) return;
    e.preventDefault();
    const target = e.currentTarget;
    target.setRangeText("  ", target.selectionStart, target.selectionEnd, "end");
    setCode(target.value);
  };

  if (!isExecutable) return null;

  return (
    <div className="mt-4 rounded-2xl border border-line bg-surface overflow-hidden shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-4 py-2.5">
        <span className="text-xs font-bold text-muted tracking-wider">交互式代码演练沙箱 ({language.toUpperCase()})
        </span>
        <div className="flex gap-2">
          {showSandbox && (
            <button
              onClick={() => setShowSandbox(false)}
              className="px-2.5 py-1 rounded-lg border border-line hover:bg-surface-3 text-[10px] font-semibold text-muted hover:text-body transition"
              type="button"
            >
              关闭控制台
            </button>
          )}
          <button
            onClick={runCode}
            className="btn-primary !px-3 !py-1 text-[10px] font-bold"
            type="button"
          >
            运行代码 ▶
          </button>
        </div>
      </div>

      <p id={hintId} className="px-4 py-1.5 text-xs text-muted">
        Tab 缩进，按 Esc 后再按 Tab 可移至下一项。
      </p>
      <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-line md:h-[260px]">
        {/* Editor */}
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { releaseTab.current = false; }}
          aria-describedby={hintId}
          aria-label="代码编辑器"
          spellCheck={false}
          className="flex-1 min-h-[180px] md:min-h-0 p-4 bg-[#0f1117] text-emerald-300 text-xs font-mono focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent resize-none leading-relaxed"
          style={{ fontFamily: 'SFMono-Regular, Consolas, Monaco, monospace' }}
        />

        {/* Sandbox Screen */}
        {showSandbox && (
          <iframe
            key={runId}
            title="Code Sandbox Output"
            className="flex-1 min-h-[200px] md:min-h-0 bg-[#090a0f] border-0"
            sandbox="allow-scripts"
            srcDoc={sandboxHtml}
          />
        )}
      </div>
    </div>
  );
}
