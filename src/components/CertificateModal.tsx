import { useState } from "react";
import { useModalA11y } from "../hooks/useModalA11y";

interface Props {
  moduleTitle: string;
  completed: number;
  total: number;
  score?: number;
  onClose: () => void;
}

export default function CertificateModal({ moduleTitle, completed, total, score, onClose }: Props) {
  const earned = total > 0 && completed === total && score !== undefined;
  const [name, setName] = useState("OpenSkill 星河学员");
  const dateStr = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
  const panelRef = useModalA11y(onClose);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="个人结业证书"
      className="fixed inset-0 !mt-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 backdrop-blur-md p-4 animate-fade-in"
    >
      <div
        ref={panelRef}
        className="card max-w-2xl w-full my-auto p-6 sm:p-8 bg-surface border-2 border-amber-500/40 shadow-[0_0_50px_rgba(251,191,36,0.15)] relative space-y-6"
      >
        <button
          onClick={onClose}
          type="button"
          aria-label="关闭弹窗"
          className="absolute top-3 right-3 icon-btn"
        >
          ✕
        </button>

        {earned ? (
          <div id="certificate-print-area" className="border-4 border-amber-500/20 p-6 sm:p-8 rounded-2xl text-center space-y-4 bg-surface-2 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 text-9xl opacity-5 pointer-events-none">🏆</div>

            <div className="text-4xl">🎓</div>
            <h2 className="text-xs font-bold text-amber-700 dark:text-amber-300 tracking-[0.25em] uppercase">
              OpenSkill Galaxy · 课程结业证书
            </h2>
            <h1 className="text-3xl font-extrabold text-body tracking-wide">结 业 证 书</h1>

            <p className="text-xs text-muted pt-2">学员姓名</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="学员姓名"
              className="input text-center text-xl font-bold text-amber-700 dark:text-amber-300 bg-transparent border-b border-amber-500/30 max-w-xs mx-auto focus:border-amber-500"
            />

            <p className="text-sm text-body leading-relaxed max-w-md mx-auto pt-2">
              已完成全部讲义并通过模拟考核
              <br />
              <strong className="text-body text-base font-bold block mt-1">《{moduleTitle}》</strong>
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line text-xs text-subtle px-2 sm:px-4">
              <div className="text-left">
                <span className="block text-[10px] text-subtle">记录来源</span>
                <span>本浏览器的学习记录</span>
              </div>
              <div className="text-center">
                <span className="block text-2xl">🏅</span>
                <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold">最高通过成绩 {score} 分</span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] text-subtle">生成日期</span>
                <span>{dateStr}</span>
              </div>
            </div>
          </div>
        ) : (
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-body">结业进度</h2>
            <p className="text-sm text-muted">完成全部讲义并通过一次模拟考试后，即可打印《{moduleTitle}》结业证书。</p>
            <p className="text-sm text-body">讲义已完成 {completed}/{total} · {score !== undefined ? `模拟考试已通过（${score} 分）` : "模拟考试待通过"}</p>
          </section>
        )}
        {/* Controls */}
        <div className="flex flex-wrap justify-center gap-3">
          {earned && <button
            onClick={() => window.print()}
            type="button"
            className="btn-primary px-6 text-xs font-bold"
          >
            打印 / 保存 PDF 证书
          </button>}
          <button
            onClick={onClose}
            type="button"
            className="btn-ghost text-xs"
          >
            关闭窗口
          </button>
        </div>
      </div>
    </div>
  );
}
