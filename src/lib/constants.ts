export const MOODS = [
  { value: "happy", label: "开心" },
  { value: "calm", label: "平淡" },
  { value: "tired", label: "疲惫" },
  { value: "moved", label: "感动" },
  { value: "surprise", label: "惊喜" },
] as const;

export const TAGS = [
  "吃饭",
  "散步",
  "电影",
  "旅行",
  "在家",
  "运动",
  "甜品",
  "认真聊天",
] as const;

export const WANT_AGAIN = [
  { value: "yes", label: "想再来一次" },
  { value: "normal", label: "一般" },
  { value: "no", label: "不太想" },
] as const;

export const DISLIKE_REASONS = [
  { value: "expensive", label: "太贵了" },
  { value: "far", label: "太远了" },
  { value: "tired", label: "今天好累" },
  { value: "plain", label: "不够特别" },
  { value: "unfit", label: "不适合我们" },
  { value: "done", label: "已经做过了" },
] as const;

export type MoodValue = (typeof MOODS)[number]["value"];
export type WantAgainValue = (typeof WANT_AGAIN)[number]["value"];

export function moodLabel(value: string) {
  return MOODS.find((m) => m.value === value)?.label ?? value;
}
