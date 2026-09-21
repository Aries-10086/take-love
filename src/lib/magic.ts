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
