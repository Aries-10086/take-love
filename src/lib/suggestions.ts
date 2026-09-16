export type SuggestionItem = {
  title: string;
  detail: string;
  duration: string;
  budget: string;
  reason: string;
  tags: string[];
};

export type MomentLike = {
  content: string;
  mood: string;
  tags: string[];
  wantAgain: string | null;
  happenedAt: Date;
};

export type FeedbackLike = {
  action: string;
  reasonCodes: string[];
  itemIndex: number;
};

const TEMPLATES: SuggestionItem[] = [
  {
    title: "傍晚慢走，再分享一份甜品",
    detail:
      "选一条不远的散步路线，走 40–60 分钟；路上只聊三件今天的小事。结束后买一份都爱的甜品，回家慢慢吃。",
    duration: "1.5-2小时",
    budget: "40-80元",
    reason: "负担低、容易完成，也适合把日常重新变得有一点仪式感。",
    tags: ["散步", "甜品", "低负担"],
  },
  {
    title: "一顿不用刷手机的晚餐",
    detail:
      "选一家不用排队太久的店，或在家认真做一顿简餐。约定进餐时把手机反扣在一边，轮流说一件最近开心的小事。",
    duration: "1.5-2小时",
    budget: "80-200元",
    reason: "认真吃饭能把注意力拉回彼此，比复杂行程更容易落地。",
    tags: ["吃饭", "认真聊天"],
  },
  {
    title: "在家电影夜 + 一点小布置",
    detail:
      "提前选好一部都没看过的片，关掉大灯、准备简单零食。看完后用三句话互评：最喜欢的镜头、最想再说一次的台词、下次想看的类型。",
    duration: "2-3小时",
    budget: "0-60元",
    reason: "适合想待在一起、又不想远行的夜晚。",
    tags: ["电影", "在家", "低负担"],
  },
  {
    title: "城市小户外：公园野餐半日",
    detail:
      "买一点现成的轻食和水果，去附近公园找树荫坐下。不安排赶场，只留拍照和发呆的时间，回家前再一起定下周末想做的一件小事。",
    duration: "2-3小时",
    budget: "60-120元",
    reason: "如果最近偏室内，这条能换换空气，又不至于太折腾。",
    tags: ["散步", "吃饭", "户外"],
  },
  {
    title: "一起做一件小事清单",
    detail:
      "各自写下三件「想和对方一起做、但一直没做」的小事，交换后选重合的一项，本周内安排最小可执行版本（30–90 分钟就能完成）。",
    duration: "1小时起",
    budget: "视事项而定",
    reason: "把愿望收成行动，比空想下一次约会更稳。",
    tags: ["认真聊天", "低负担"],
  },
  {
    title: "轻运动约会：骑行或羽毛球",
    detail:
      "选一项双方都能接受的轻度运动，控制在 60–90 分钟。结束后喝一杯水或饮料，聊聊今天身体和心情的状态，不比较输赢。",
    duration: "1.5-2小时",
    budget: "0-100元",
    reason: "一起动一动能换心情，也避免约会总是「坐着吃」。",
    tags: ["运动", "低负担"],
  },
];

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function parseTags(tags: string) {
  return parseJsonArray(tags);
}

export function parseSuggestionPayload(payload: string): SuggestionItem[] {
  try {
    const parsed = JSON.parse(payload) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      .map((item) => ({
        title: String(item.title ?? ""),
        detail: String(item.detail ?? ""),
        duration: String(item.duration ?? ""),
        budget: String(item.budget ?? ""),
        reason: String(item.reason ?? ""),
        tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
      }))
      .filter((item) => item.title && item.detail);
  } catch {
    return [];
  }
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generateSuggestions(
  moments: MomentLike[],
  feedbacks: FeedbackLike[] = [],
): SuggestionItem[] {
  const recent = moments.slice(0, 20);
  const tagCount = new Map<string, number>();
  const moodCount = new Map<string, number>();
  let wantAgainCount = 0;
  let indoorBias = 0;
  let outdoorBias = 0;

  for (const m of recent) {
    moodCount.set(m.mood, (moodCount.get(m.mood) ?? 0) + 1);
    if (m.wantAgain === "yes") wantAgainCount += 1;
    for (const tag of m.tags) {
      tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
      if (["在家", "电影", "吃饭"].includes(tag)) indoorBias += 1;
      if (["散步", "旅行", "运动"].includes(tag)) outdoorBias += 1;
    }
  }

  const dislikedTags = new Set<string>();
  for (const fb of feedbacks) {
    if (fb.action === "dislike") {
      for (const code of fb.reasonCodes) {
        if (code === "tired") dislikedTags.add("运动");
        if (code === "expensive") dislikedTags.add("旅行");
      }
    }
  }

  const scored = TEMPLATES.map((item) => {
    let score = 1;
    const reasons: string[] = [];

    if (indoorBias >= 3 && outdoorBias <= 1 && item.tags.includes("户外")) {
      score += 3;
      reasons.push("你们最近几次更偏室内，换一次短户外会更有新鲜感");
    }
    if (wantAgainCount >= 2 && item.tags.some((t) => (tagCount.get(t) ?? 0) > 0)) {
      score += 2;
      reasons.push("你们有过「想再来一次」的标记，这条延续了熟悉又好完成的感觉");
    }
    if ((moodCount.get("tired") ?? 0) >= 2 && item.tags.includes("低负担")) {
      score += 3;
      reasons.push("最近记录里有疲惫感，所以优先低负担安排");
    }
    if ((tagCount.get("吃饭") ?? 0) === 0 && item.tags.includes("吃饭")) {
      score += 2;
      reasons.push("最近很少认真吃饭相关的记录，补一顿会很合适");
    }
    if (item.tags.some((t) => dislikedTags.has(t))) {
      score -= 3;
    }
    const overlap = item.tags.reduce((n, t) => n + (tagCount.get(t) ?? 0), 0);
    if (overlap >= 4) score -= 1;

    const reason =
      reasons[0] ??
      (recent.length === 0
        ? "还没有太多记录，先从轻松、好完成的约会开始"
        : item.reason);

    return { ...item, reason, score };
  });

  // Empty history: rotate templates so first runs don't feel identical
  if (recent.length === 0) {
    return shuffle(scored).slice(0, 3).map(({ score: _s, ...item }) => item);
  }

  return scored
    .sort((a, b) => b.score - a.score || Math.random() - 0.5)
    .slice(0, 3)
    .map(({ score: _score, ...item }) => item);
}
