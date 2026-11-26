import { useEffect, useMemo, useRef, useState } from "react";
import { STORAGE_KEYS } from "../config/constants";
import { readJson, writeJson } from "../utils/storage";

// 使用本地时区日期作为打卡 key，避免 toISOString (UTC) 造成跨日偏移
function localDateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function StudyAnalytics() {
  const [activeDates, setActiveDates] = useState(() =>
    readJson<Record<string, number>>("active-dates", {}, STORAGE_KEYS.ACTIVE_DATES)
  );
  const checkedIn = useRef(false);
  useEffect(() => {
    if (checkedIn.current) return;
    checkedIn.current = true;
    const key = localDateKey(new Date());
    const next = { ...activeDates, [key]: (activeDates[key] || 0) + 1 };
    writeJson("active-dates", next);
    setActiveDates(next);
  }, [activeDates]);

  const { daysGrid, streak, totalActiveDays } = useMemo(() => {
    const grid: { date: string; count: number; level: number }[] = [];
    const today = new Date();
    for (let i = 59; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateKey = localDateKey(d);
      const count = activeDates[dateKey] || 0;
      
      let level = 0;
      if (count >= 5) level = 4;
      else if (count >= 3) level = 3;
      else if (count >= 2) level = 2;
      else if (count >= 1) level = 1;

      grid.push({ date: dateKey, count, level });
    }

    let streak = 0;
    const date = new Date(today);
    while (activeDates[localDateKey(date)] > 0) {
      streak++;
      date.setDate(date.getDate() - 1);
    }
    const totalActiveDays = Object.values(activeDates).filter((count) => count > 0).length;
    return { daysGrid: grid, streak, totalActiveDays };
  }, [activeDates]);

  // 浅色主题走浅→深绿色阶，深色主题保留原半透明色阶
  const getLevelColor = (level: number) => {
    switch (level) {
      case 4: return "bg-emerald-600 dark:bg-emerald-400 dark:shadow-[0_0_8px_rgba(52,211,153,0.5)]";
      case 3: return "bg-emerald-500 dark:bg-emerald-500/80";
      case 2: return "bg-emerald-300 dark:bg-emerald-600/50";
      case 1: return "bg-emerald-200 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-500/20";
      default: return "bg-slate-200/80 dark:bg-white/[0.04] border border-slate-300 dark:border-white/[0.08]";
    }
  };

  return (
    <div className="card p-5 space-y-4 border border-slate-200 dark:border-white/10">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔥</span>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">近 60 天学习打卡</h3>
            <p className="text-[11px] text-slate-500 dark:text-white/50">已连续学习 <strong className="text-amber-700 dark:text-amber-300 font-extrabold">{streak} 天</strong> · 累计打卡 {totalActiveDays} 天</p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-300 bg-brand-500/10 px-2.5 py-1 rounded-full border border-brand-500/20">
          Streak: {streak}d 🔥
        </span>
      </div>

      {/* 60-Day Contribution Heatmap Grid */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-subtle font-mono">
          <span>59 天前</span>
          <span>今日</span>
        </div>
        
        <div className="grid grid-flow-col grid-rows-5 gap-1.5 overflow-x-auto pb-1">
          {daysGrid.map((item) => (
            <div
              key={item.date}
              className={`h-3.5 w-3.5 rounded-sm transition-all duration-200 hover:scale-125 ${getLevelColor(item.level)}`}
              title={`${item.date}: ${item.count} 次打卡学习`}
            />
          ))}
        </div>

        <div className="flex items-center justify-end gap-1.5 text-[10px] text-subtle pt-1">
          <span>少</span>
          <div className="h-2.5 w-2.5 rounded-sm bg-slate-200 dark:bg-white/[0.04]" />
          <div className="h-2.5 w-2.5 rounded-sm bg-emerald-200 dark:bg-emerald-900/40" />
          <div className="h-2.5 w-2.5 rounded-sm bg-emerald-300 dark:bg-emerald-600/50" />
          <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500 dark:bg-emerald-500/80" />
          <div className="h-2.5 w-2.5 rounded-sm bg-emerald-600 dark:bg-emerald-400" />
          <span>多</span>
        </div>
      </div>
    </div>
  );
}
