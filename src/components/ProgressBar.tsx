interface Props {
  value: number; // 0-100
  label?: string;
  className?: string;
}

export default function ProgressBar({ value, label, className = "" }: Props) {
  const v = Math.max(0, Math.min(100, value));
  const color = v === 100 ? "bg-emerald-500" : v > 0 ? "bg-accent" : "bg-surface-3";
  return (
    <div className={`w-full ${className}`}>
      <div role="progressbar" aria-label={label || "进度"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} className="h-2 w-full rounded-full bg-surface-3 overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${v}%` }}
        />
      </div>
      {label && <p className="mt-1 text-xs text-white/50">{label}</p>}
    </div>
  );
}
