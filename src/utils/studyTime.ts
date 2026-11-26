// Only show a total when every listed lesson has a positive estimate.
export function sumMinutes(values: readonly (number | undefined)[]): number | undefined {
  if (values.length === 0) return undefined;
  let total = 0;
  for (const minutes of values) {
    if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes <= 0) return undefined;
    total += minutes;
  }
  return total;
}

export function formatStudyTime(minutes?: number): string {
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes <= 0) return "暂无估时";
  if (minutes < 60) return `约 ${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `约 ${hours} 小时 ${rest} 分钟` : `约 ${hours} 小时`;
}

export function courseMinutes(ids: string[], lessons: readonly { id: string; estimatedMinutes?: number }[]) {
  return sumMinutes([...new Set(ids)].map((id) => lessons.find((lesson) => lesson.id === id)?.estimatedMinutes));
}
