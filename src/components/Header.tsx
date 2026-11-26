import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import SearchBox from "./SearchBox";
import { useModalA11y } from "../hooks/useModalA11y";
import PomodoroTimer from "./PomodoroTimer";
import ExportDataModal from "./ExportDataModal";
import AchievementsModal from "./AchievementsModal";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal";
import { collectProgressBackup, restoreProgressBackup } from "../utils/storage";
import {
  IconMenu,
  IconClose,
  IconSun,
  IconMoon,
  IconCloud,
  IconArchive,
  IconTrophy,
  IconKeyboard,
  IconDownload,
  colorFromId,
  monogram,
} from "./icons";
import type { ModuleMeta } from "../types";
import type { ModuleData } from "../data/loaders";

// Appwrite SDK 体积大且大多数访客用不到，按需加载
const AppwriteModal = lazy(() => import("./AppwriteModal"));

function BackupModal({ onClose }: { onClose: () => void }) {
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const panelRef = useModalA11y(onClose);

  const handleExport = () => {
    setError("");
    setSuccess("");
    try {
      const backup = collectProgressBackup(true);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `openskill_galaxy_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess("已导出进度备份。");
      setTimeout(() => setSuccess(""), 2000);
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message.startsWith("导出失败")
            ? e.message
            : `导出失败：${e.message}`
          : "导出失败"
      );
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setSuccess("");
    const reader = new FileReader();
    reader.onload = (evt) => {
      setError("");
      setSuccess("");
      try {
        const data = JSON.parse(evt.target?.result as string);
        restoreProgressBackup(data, true);
        setSuccess("备份已恢复，即将重新载入。");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (err: unknown) {
        if (err instanceof SyntaxError) {
          setError(`导入失败：JSON 格式无效（${err.message}）`);
        } else if (err instanceof Error) {
          setError(err.message.startsWith("导入失败") ? err.message : `导入失败：${err.message}`);
        } else {
          setError("导入失败：文件格式有误");
        }
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/40 backdrop-blur-sm animate-fade-in p-4"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="本地 JSON 备份与同步"
        onClick={(e) => e.stopPropagation()}
        className="card my-auto w-full max-w-sm p-6 relative flex flex-col gap-5"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        <button
          onClick={onClose}
          aria-label="关闭弹窗"
          className="absolute right-4 top-4 icon-btn"
          type="button"
        >
          <IconClose size={16} />
        </button>
        <div>
          <h3 className="text-base font-bold text-body tracking-wide">备份与同步</h3>
          <p className="text-xs text-muted mt-1">导出或恢复您在全站模块的学习进度与收藏夹数据</p>
        </div>

        {error && (
          <div className="text-xs text-rose-700 dark:text-rose-300 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
            {success}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={handleExport}
            className="btn-primary w-full text-xs font-semibold"
            type="button"
          >
            导出进度备份 (.json)
          </button>

          <label className="btn-ghost relative w-full text-xs font-semibold text-center cursor-pointer block py-2.5 focus-within:ring-2">
            导入进度备份 (.json)
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="sr-only"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

const mobileNavGroups = [
  {
    title: "学习",
    items: [
      { to: "/", label: "首页", end: true },
      { to: "/courses", label: "课程列表" },
      { to: "/knowledge", label: "知识点库" },
      { to: "/routes", label: "学习路线", end: true },
      { to: "/cases", label: "案例训练" },
    ],
  },
  {
    title: "练习",
    items: [
      { to: "/questions", label: "题库练习" },
      { to: "/exams", label: "模拟考试" },
      { to: "/wrong", label: "错题本" },
      { to: "/favorites", label: "收藏夹" },
    ],
  },
  {
    title: "其它",
    items: [
      { to: "/search", label: "搜索", end: true },
      { to: "/faq", label: "FAQ", end: true },
      { to: "/about", label: "关于本模块", end: true },
    ],
  },
];

export default function Header({ module, data }: { module: ModuleMeta; data: ModuleData }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [showBackup, setShowBackup] = useState(false);
  const [showAppwrite, setShowAppwrite] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (e.defaultPrevented || document.querySelector('[aria-modal="true"]')) return;
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme !== "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    setShowMobileMenu(false);
  }, [pathname]);

  useEffect(() => {
    if (!showMobileMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowMobileMenu(false);
    };
    const onPointerDown = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [showMobileMenu]);

  const badgeColor = colorFromId(module.slug);

  return (
    <>
      <header ref={headerRef} className="app-bar sticky top-0 z-30 border-b border-line bg-page">
        <div className="container-page module-bar-inner flex h-16 items-center gap-2 sm:gap-3">
          {/* Mobile Hamburger Menu Toggle Button */}
          <button
            onClick={() => setShowMobileMenu((v) => !v)}
            aria-label={showMobileMenu ? "关闭移动导航菜单" : "打开移动导航菜单"}
            aria-expanded={showMobileMenu}
            type="button"
            className="md:hidden icon-btn shrink-0"
          >
            {showMobileMenu ? <IconClose size={17} /> : <IconMenu size={17} />}
          </button>

          <Link to="/" className="flex items-center gap-2.5 font-bold transition hover:opacity-90 shrink-0 sm:min-w-0">
            <span
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center brand-mark text-sm font-bold"
              style={{ background: badgeColor.soft, color: badgeColor.fg }}
            >
              {monogram(module.title)}
            </span>
            <span className="hidden sm:block text-body tracking-tight text-sm font-bold truncate max-w-[110px] lg:max-w-[200px]">
              {module.title}
            </span>
            <span className="hidden lg:inline rounded-md border border-line bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-subtle shrink-0">
              v{module.version}
            </span>
          </Link>

          <a
            href={module.portalUrl || "https://openskill-galaxy.github.io/"}
            className="hidden lg:inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-2 hover:text-body transition duration-200 whitespace-nowrap shrink-0"
          >
            ← 返回总站
          </a>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 justify-end">
            <div className="min-w-0 flex-1 max-w-[220px] sm:max-w-xs">
              <SearchBox data={data} />
            </div>
            <PomodoroTimer />
            <button
              onClick={() => setShowAppwrite(true)}
              className="icon-btn hidden md:inline-flex"
              title="Appwrite 云端数据同步与认证"
              aria-label="Appwrite 云端同步"
              type="button"
            >
              <IconCloud size={17} />
            </button>
            <button
              onClick={() => setShowExport(true)}
              className="icon-btn hidden md:inline-flex"
              title="多格式学习档案与数据导出"
              aria-label="多格式数据导出"
              type="button"
            >
              <IconDownload size={17} />
            </button>
            <button
              onClick={() => setShowBackup(true)}
              className="icon-btn hidden md:inline-flex"
              title="本地 JSON 进度备份"
              aria-label="本地 JSON 备份"
              type="button"
            >
              <IconArchive size={17} />
            </button>
            <button
              onClick={() => setShowAchievements(true)}
              className="icon-btn hidden md:inline-flex"
              title="游戏化成就勋章墙"
              aria-label="成就勋章墙"
              type="button"
            >
              <IconTrophy size={17} />
            </button>
            <button
              onClick={() => setShowShortcuts(true)}
              className="icon-btn hidden md:inline-flex"
              title="全站键盘快捷键指南 (Shift+?)"
              aria-label="键盘快捷键指南"
              type="button"
            >
              <IconKeyboard size={17} />
            </button>
            <button
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className="icon-btn shrink-0"
              title={theme === "dark" ? "切换至亮色模式" : "切换至暗色模式"}
              aria-label="切换主题模式"
              type="button"
            >
              {theme === "dark" ? <IconSun size={17} /> : <IconMoon size={17} />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {showMobileMenu && (
          <nav
            aria-label="移动端导航"
            className="md:hidden border-t border-line bg-page px-4 py-4 space-y-4 animate-fade-in max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-2 pb-2 border-b border-line">
              <span className="text-sm font-bold text-body truncate">{module.title}</span>
              <span className="text-xs text-subtle">v{module.version}</span>
            </div>

            {mobileNavGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-subtle px-2 tracking-wider">
                  {group.title}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setShowMobileMenu(false)}
                      className={({ isActive }) =>
                        `px-3 py-2 rounded-xl text-xs font-semibold transition ${
                          isActive
                            ? "bg-accent-soft text-brand font-semibold"
                            : "text-muted hover:text-body hover:bg-surface-2"
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}

            <div className="space-y-1 pt-2 border-t border-line">
              <p className="text-[10px] uppercase font-bold text-subtle px-2 tracking-wider">
                工具与同步
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowMobileMenu(false);
                    setShowAppwrite(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-muted hover:text-body hover:bg-surface-2 text-left transition"
                >
                  <IconCloud size={15} /> 云端同步
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMobileMenu(false);
                    setShowAchievements(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-muted hover:text-body hover:bg-surface-2 text-left transition"
                >
                  <IconTrophy size={15} /> 成就勋章墙
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMobileMenu(false);
                    setShowExport(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-muted hover:text-body hover:bg-surface-2 text-left transition"
                >
                  <IconDownload size={15} /> 数据导出
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMobileMenu(false);
                    setShowBackup(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-muted hover:text-body hover:bg-surface-2 text-left transition"
                >
                  <IconArchive size={15} /> JSON 备份
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMobileMenu(false);
                    setShowShortcuts(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-muted hover:text-body hover:bg-surface-2 text-left transition"
                >
                  <IconKeyboard size={15} /> 快捷键指南
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-line flex items-center justify-between text-xs">
              <a
                href={module.portalUrl || "https://openskill-galaxy.github.io/"}
                className="text-brand font-semibold hover:underline"
              >
                ← 返回星河总入口站
              </a>
            </div>
          </nav>
        )}
      </header>

      {showBackup && <BackupModal onClose={() => setShowBackup(false)} />}
      {showAppwrite && (
        <Suspense fallback={null}>
          <AppwriteModal onClose={() => setShowAppwrite(false)} />
        </Suspense>
      )}
      {showExport && <ExportDataModal onClose={() => setShowExport(false)} />}
      {showAchievements && <AchievementsModal onClose={() => setShowAchievements(false)} />}
      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </>
  );
}
