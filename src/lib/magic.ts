import { parseTags } from "@/lib/suggestions";
import { moodLabel } from "@/lib/constants";

type MomentInput = {
  content: string;
  mood: string;
  tags: string;
  wantAgain: string | null;
  happenedAt: Date;
  authorName: string;
};

type PlanInput = {
  title: string;
  status: string;
  completedAt: Date | null;
};

export function buildLoveReport(input: {
  spaceName: string;
  meName: string;
  partnerName?: string | null;
  daysTogether: number;
  moments: MomentInput[];
  plans: PlanInput[];
}) {
  const { spaceName, meName, partnerName, daysTogether, moments, plans } = input;
  const shared = moments;
  const weekAgo = Date.now() - 7 * 86400000;
  const weekMoments = shared.filter((m) => m.happenedAt.getTime() >= weekAgo);
  const completed = plans.filter((p) => p.status === "completed");
  const weekDone = completed.filter(
    (p) => p.completedAt && p.completedAt.getTime() >= weekAgo,
  );

  const tagCount = new Map<string, number>();
  const moodCount = new Map<string, number>();
  for (const m of shared) {
    moodCount.set(m.mood, (moodCount.get(m.mood) ?? 0) + 1);
    for (const t of parseTags(m.tags)) {
      tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
    }
  }

  const topTag =
    [...tagCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "日常";
  const topMood =
    [...moodCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "happy";
  const highlight =
    weekMoments.find((m) => m.wantAgain === "yes") ??
    weekMoments[0] ??
    shared[0] ??
    null;

  const who = partnerName ? `${meName} 与 ${partnerName}` : meName;
  const lines: string[] = [];

  lines.push(`致「${spaceName}」里的 ${who}：`);
  lines.push("");
  lines.push(
    `你们已经一起走过 ${daysTogether} 天。这段时间里，一共沉淀了 ${shared.length} 段时刻，完成了 ${completed.length} 次约会。`,
  );
  lines.push("");
  lines.push(
    `最近 7 天，你们写下了 ${weekMoments.length} 段相处，完成了 ${weekDone.length} 次约会。出现最多的心情是「${moodLabel(topMood)}」，最常一起做的是「${topTag}」。`,
  );

  if (highlight) {
    lines.push("");
    lines.push(
      `特别想再提一次：${highlight.authorName} 写过「${highlight.content.slice(0, 60)}${highlight.content.length > 60 ? "…" : ""}」——这样的句子，值得被记住。`,
    );
  }

  lines.push("");
  if (weekMoments.length === 0) {
    lines.push("这周稍微安静了一点。不一定要轰轰烈烈，一句「今天想你」也算捡起一点爱。");
  } else if (weekDone.length > 0) {
    lines.push("你们不只是记录，还真的把约会做成了。下一件小事，可以继续轻轻往前。");
  } else {
    lines.push("回忆已经很多了。如果想再靠近一点，去生成一条下次约会，把它变成行动。");
  }

  lines.push("");
  lines.push("—— 捡爱，替你们收好这些瞬间。");

  return {
    title: "恋爱报告",
    body: lines.join("\n"),
    stats: {
      daysTogether,
      momentCount: shared.length,
      weekMoments: weekMoments.length,
      completedPlans: completed.length,
      weekDone: weekDone.length,
      topTag,
      topMood: moodLabel(topMood),
    },
  };
}

export const SYNC_PROMPTS = [
  "如果今晚只能一起做一件事，你会选什么？",
  "你觉得我们最像的地方是什么？",
  "下次旅行，你最想去哪种地方？",
  "你记得我们第一次认真聊天聊了什么吗？",
  "最近一次让你觉得被爱的瞬间是什么？",
  "如果我们的关系是一种天气，你觉得是？",
  "你更想要：安静的陪伴，还是热闹的约会？",
  "用一个词形容现在的我们。",
];

export const TONIGHT_OPTIONS = [
  "今晚听你的",
  "今晚听我的",
  "掷硬币再定",
  "一人选一道菜",
  "关掉手机一小时",
  "一起散十分钟步",
];

export const DARE_SPINS = [
  "给对方写一句没说过的夸奖",
  "模仿对方最常用的口头禅",
  "今晚由对方点歌，完整听完",
  "交换手机壁纸一天",
  "一起做一件从没做过的小事",
  "用三句话复盘今天",
  "给对方揉肩两分钟",
  "一起挑下周约会的候选",
  "互相说一件最近的小担忧",
  "今晚不看短视频，只聊天",
];

export const TRUTH_CARDS = [
  "你最近一次想我，是因为什么？",
  "如果重来一次第一次见面，你会改什么？",
  "你希望我多做一件什么小事？",
  "我们相处里，你最安心的瞬间是？",
  "有什么话你想说但一直没说出口？",
  "你觉得我们现在最需要补的是什么？",
  "用一种食物形容我，为什么？",
  "你最想一起完成的一件长期事是什么？",
];

export const WOULD_YOU_RATHER = [
  { a: "周末宅家看电影", b: "出门随便走走吃吃" },
  { a: "突然的小旅行", b: "计划很久的正式约会" },
  { a: "互送实用礼物", b: "互送很傻但很甜的礼物" },
  { a: "一起做饭", b: "一起探店" },
  { a: "早安长语音", b: "晚安短消息" },
  { a: "盛大纪念日", b: "普通日子里的小仪式" },
  { a: "并肩安静坐着", b: "聊到停不下来" },
  { a: "雨天约会", b: "晴天野餐" },
];

export const FORTUNE_STICKS = [
  "上签：今晚适合坦白一件小事。",
  "上签：你们最近的耐心，会换来一次很甜的回应。",
  "中签：先解决肚子，再解决情绪。",
  "中签：把手机放下十分钟，世界会小一点。",
  "上签：一个拥抱，胜过三条解释。",
  "下签转上：今天有点别扭也没关系，睡一觉会好。",
  "上签：去翻翻你们最早的一条时刻。",
  "中签：让对方选今晚的歌单。",
  "上签：说一句「谢谢你还在」。",
  "中签：一起列三个下周想做的小事。",
];

export const HOT_SEAT = [
  "如果我变成一只动物，你会怎么照顾我？",
  "你觉得我最被低估的优点是什么？",
  "我们下次吵架时，你希望我怎么做？",
  "用一部电影形容我们现在的阶段。",
  "你偷偷希望我养成的一个习惯是？",
  "如果明天只有我们两个人的世界，你想先做什么？",
];

export const MADLIB_TEMPLATES = [
  {
    labels: ["形容词", "地点", "小事", "感受"],
    build: (w: string[]) =>
      `在那个${w[0]}的${w[1]}，我们做了${w[2]}。我当时觉得${w[3]}，现在想起来还是会笑。`,
  },
  {
    labels: ["称呼", "食物", "天气", "约定"],
    build: (w: string[]) =>
      `亲爱的${w[0]}：今晚想和你吃${w[1]}。就算${w[2]}，也想牵着你，完成我们的${w[3]}。`,
  },
  {
    labels: ["时间", "歌曲", "动作", "结束语"],
    build: (w: string[]) =>
      `${w[0]}的时候，耳机里是${w[1]}。我想${w[2]}，然后对你说：${w[3]}。`,
  },
];

export function dayKeysBack(n: number, from = new Date()) {
  const keys: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const d = new Date(from);
    d.setDate(from.getDate() - i);
    keys.push(todayKey(d));
  }
  return keys;
}

/** Count consecutive days (from today backward) where both members logged mood. */
export function computeMoodStreak(
  days: string[],
  moods: { userId: string; day: string }[],
  memberIds: string[],
) {
  if (memberIds.length < 2) return 0;
  let streak = 0;
  for (const day of days) {
    const logged = new Set(
      moods.filter((m) => m.day === day).map((m) => m.userId),
    );
    if (memberIds.every((id) => logged.has(id))) streak += 1;
    else break;
  }
  return streak;
}

export function normalizeAnswer(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, "");
}

export function answersMatch(a: string, b: string) {
  const na = normalizeAnswer(a);
  const nb = normalizeAnswer(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return na.includes(nb) || nb.includes(na);
}

export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
