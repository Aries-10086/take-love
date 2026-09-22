/** Compact Chinese relative time for couple presence lines. */
export function formatRelativeZh(date: Date, now = new Date()) {
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "刚刚";

  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;

  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startToday.getTime() - startThat.getTime()) / 86400000);

  if (dayDiff === 1) return "昨天";
  if (dayDiff === 2) return "前天";
  if (dayDiff < 7) return `${dayDiff} 天前`;
  if (dayDiff < 30) return `${Math.floor(dayDiff / 7)} 周前`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function isSameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
