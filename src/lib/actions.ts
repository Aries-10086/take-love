"use server";

import { hash } from "bcryptjs";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import {
  allocateInviteCode,
  getMembership,
  makeInviteCode,
  requireUser,
} from "@/lib/space";
import {
  generateSuggestions,
  parseSuggestionPayload,
  parseTags,
  isAnniversarySoon,
  anniversaryRitualItem,
} from "@/lib/suggestions";
import {
  sanitizeMood,
  sanitizeTags,
  sanitizeVisibility,
  sanitizeWantAgain,
} from "@/lib/validate";

const registerSchema = z.object({
  name: z.string().min(1).max(40),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export type ActionState = {
  error?: string;
  success?: string;
};

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const limited = rateLimit(clientKey("register", formData), 8, 15 * 60_000);
  if (!limited.ok) {
    return { error: `尝试太频繁，请 ${limited.retryAfterSec} 秒后再试` };
  }

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "请填写有效的昵称、邮箱和至少 8 位密码" };
  }

  const email = parsed.data.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "这个邮箱已经注册过了" };

  const passwordHash = await hash(parsed.data.password, 10);
  const created = await prisma.user.create({
    data: {
      name: parsed.data.name.trim(),
      email,
      passwordHash,
    },
  });

  const inviteCode = String(formData.get("inviteCode") ?? "")
    .trim()
    .toUpperCase();
  let joined = false;

  if (inviteCode) {
    try {
      await prisma.$transaction(async (tx) => {
        const space = await tx.space.findUnique({
          where: { inviteCode },
          include: { members: true },
        });
        if (!space || space.members.length >= 2) return;
        await tx.spaceMember.create({
          data: {
            spaceId: space.id,
            userId: created.id,
            role: "member",
          },
        });
        joined = true;
      });
    } catch {
      joined = false;
    }
  }

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: joined
        ? "/home?joined=1"
        : inviteCode
          ? `/onboarding?code=${encodeURIComponent(inviteCode)}`
          : "/enter",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "注册成功，但自动登录失败，请手动登录" };
    }
    throw error;
  }

  return {};
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const limited = rateLimit(clientKey("login", formData), 12, 15 * 60_000);
  if (!limited.ok) {
    return { error: `尝试太频繁，请 ${limited.retryAfterSec} 秒后再试` };
  }

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "").trim();
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/enter";
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: next,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "邮箱或密码不对" };
    }
    throw error;
  }
  return {};
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

/** Leave space (with handoff), anonymize credentials, then sign out. */
export async function deleteAccountAction() {
  const user = await requireUser();
  if (!user?.id) redirect("/login");

  const membership = await getMembership(user.id);
  if (membership) {
    const spaceId = membership.spaceId;
    await prisma.$transaction(async (tx) => {
      await tx.spaceMember.delete({ where: { id: membership.id } });
      const remaining = await tx.spaceMember.findMany({ where: { spaceId } });
      if (remaining.length === 0) {
        await tx.space.delete({ where: { id: spaceId } });
      } else {
        const heir = remaining[0];
        let inviteCode = makeInviteCode();
        for (let i = 0; i < 8; i += 1) {
          const clash = await tx.space.findUnique({ where: { inviteCode } });
          if (!clash) break;
          inviteCode = makeInviteCode();
        }
        await tx.spaceMember.update({
          where: { id: heir.id },
          data: { role: "owner" },
        });
        await tx.space.update({
          where: { id: spaceId },
          data: { createdBy: heir.userId, inviteCode },
        });
      }
    });
  }

  const tombstone = `deleted_${user.id.slice(0, 8)}_${Date.now()}@invalid.local`;
  const passwordHash = await hash(`${user.id}.${Date.now()}.revoked`, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      email: tombstone,
      name: "已注销用户",
      passwordHash,
    },
  });

  await signOut({ redirectTo: "/" });
}

export async function createSpaceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!user?.id) return { error: "请先登录" };

  const existing = await getMembership(user.id);
  if (existing) {
    redirect("/home");
  }

  const name = String(formData.get("name") ?? "").trim() || "我们的捡爱";
  let inviteCode: string;
  try {
    inviteCode = await allocateInviteCode(async (code) => {
      const clash = await prisma.space.findUnique({ where: { inviteCode: code } });
      return Boolean(clash);
    });
  } catch {
    return { error: "邀请码生成失败，请稍后再试" };
  }

  await prisma.space.create({
    data: {
      name,
      inviteCode,
      createdBy: user.id,
      members: {
        create: {
          userId: user.id,
          role: "owner",
        },
      },
    },
  });

  redirect("/home?welcome=1");
}

export async function joinSpaceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!user?.id) return { error: "请先登录" };

  const limited = rateLimit(clientKey("join", formData, user.id), 10, 15 * 60_000);
  if (!limited.ok) {
    return { error: `尝试太频繁，请 ${limited.retryAfterSec} 秒后再试` };
  }

  const existing = await getMembership(user.id);
  if (existing) return { error: "你已经在一个恋爱空间里了" };

  const code = String(formData.get("inviteCode") ?? "")
    .trim()
    .toUpperCase();
  if (!code) return { error: "请输入邀请码" };

  try {
    await prisma.$transaction(async (tx) => {
      const space = await tx.space.findUnique({
        where: { inviteCode: code },
        include: { members: true },
      });
      if (!space) throw new Error("INVITE_INVALID");
      if (space.members.length >= 2) throw new Error("SPACE_FULL");

      const already = await tx.spaceMember.findUnique({
        where: { userId: user.id },
      });
      if (already) throw new Error("ALREADY_IN_SPACE");

      await tx.spaceMember.create({
        data: {
          spaceId: space.id,
          userId: user.id,
          role: "member",
        },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "INVITE_INVALID") return { error: "邀请码无效" };
    if (message === "SPACE_FULL") return { error: "这个空间已经满员了" };
    if (message === "ALREADY_IN_SPACE") return { error: "你已经在一个恋爱空间里了" };
    throw error;
  }

  redirect("/home?joined=1");
}

export async function leaveSpaceAction() {
  const user = await requireUser();
  if (!user?.id) redirect("/login");

  const membership = await getMembership(user.id);
  if (!membership) redirect("/onboarding");

  const spaceId = membership.spaceId;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.spaceMember.delete({ where: { id: membership.id } });
      const remaining = await tx.spaceMember.findMany({ where: { spaceId } });

      if (remaining.length === 0) {
        await tx.space.delete({ where: { id: spaceId } });
        return;
      }

      // Promote the remaining partner and rotate invite so old codes die.
      const heir = remaining[0];
      let inviteCode = makeInviteCode();
      for (let i = 0; i < 8; i += 1) {
        const clash = await tx.space.findUnique({ where: { inviteCode } });
        if (!clash) break;
        inviteCode = makeInviteCode();
      }

      await tx.spaceMember.update({
        where: { id: heir.id },
        data: { role: "owner" },
      });
      await tx.space.update({
        where: { id: spaceId },
        data: {
          createdBy: heir.userId,
          inviteCode,
        },
      });
    });
  } catch {
    redirect("/settings");
  }

  revalidatePath("/home");
  revalidatePath("/settings");
  redirect("/onboarding");
}

export async function updateSpacePrefsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!user?.id) return { error: "请先登录" };
  const membership = await getMembership(user.id);
  if (!membership) return { error: "请先加入空间" };

  const name = String(formData.get("name") ?? "").trim();
  const budgetPref = String(formData.get("budgetPref") ?? "any");
  const anniversaryRaw = String(formData.get("anniversaryAt") ?? "");

  if (!name) return { error: "空间名称不能为空" };
  if (name.length > 40) return { error: "名称请控制在 40 字以内" };
  if (!["any", "low", "mid"].includes(budgetPref)) {
    return { error: "预算偏好不合法" };
  }

  await prisma.space.update({
    where: { id: membership.spaceId },
    data: {
      name,
      budgetPref,
      anniversaryAt: anniversaryRaw ? new Date(anniversaryRaw) : null,
    },
  });
  revalidatePath("/home");
  revalidatePath("/settings");
  return { success: "空间设置已更新" };
}

/** @deprecated use updateSpacePrefsAction */
export async function renameSpaceAction(
  prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return updateSpacePrefsAction(prev, formData);
}

export async function resetInviteCodeAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!user?.id) return { error: "请先登录" };
  const membership = await getMembership(user.id);
  if (!membership) return { error: "请先加入空间" };

  // Any remaining member can rotate the invite (needed after ownership handoff).
  let inviteCode: string;
  try {
    inviteCode = await allocateInviteCode(async (code) => {
      const clash = await prisma.space.findUnique({ where: { inviteCode: code } });
      return Boolean(clash);
    });
  } catch {
    return { error: "邀请码生成失败，请稍后再试" };
  }

  await prisma.space.update({
    where: { id: membership.spaceId },
    data: { inviteCode },
  });
  revalidatePath("/settings");
  revalidatePath("/home");
  return { success: `新邀请码：${inviteCode}` };
}

export async function createMomentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!user?.id) return { error: "请先登录" };
  const membership = await getMembership(user.id);
  if (!membership) return { error: "请先创建或加入空间" };

  const content = String(formData.get("content") ?? "").trim();
  const mood = sanitizeMood(String(formData.get("mood") ?? ""));
  const visibility = sanitizeVisibility(String(formData.get("visibility") ?? "shared"));
  const wantAgain = sanitizeWantAgain(String(formData.get("wantAgain") ?? ""));
  const happenedAtRaw = String(formData.get("happenedAt") ?? "");
  const tags = sanitizeTags(formData.getAll("tags").map(String));

  if (!content) return { error: "写一句今天的相处吧" };
  if (content.length > 200) return { error: "尽量控制在 200 字以内" };
  if (!mood) return { error: "选一个心情" };
  if (!visibility) return { error: "可见性不合法" };

  await prisma.moment.create({
    data: {
      spaceId: membership.spaceId,
      authorId: user.id,
      content,
      mood,
      tags: JSON.stringify(tags),
      visibility,
      wantAgain,
      happenedAt: happenedAtRaw ? new Date(happenedAtRaw) : new Date(),
    },
  });

  revalidatePath("/home");
  redirect("/home?saved=1");
}

export async function updateMomentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!user?.id) return { error: "请先登录" };
  const membership = await getMembership(user.id);
  if (!membership) return { error: "请先创建或加入空间" };

  const momentId = String(formData.get("momentId") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  const mood = sanitizeMood(String(formData.get("mood") ?? ""));
  const visibility = sanitizeVisibility(String(formData.get("visibility") ?? "shared"));
  const wantAgain = sanitizeWantAgain(String(formData.get("wantAgain") ?? ""));
  const happenedAtRaw = String(formData.get("happenedAt") ?? "");
  const tags = sanitizeTags(formData.getAll("tags").map(String));

  if (!content) return { error: "写一句今天的相处吧" };
  if (content.length > 200) return { error: "尽量控制在 200 字以内" };
  if (!mood) return { error: "选一个心情" };
  if (!visibility) return { error: "可见性不合法" };

  const moment = await prisma.moment.findFirst({
    where: { id: momentId, spaceId: membership.spaceId, authorId: user.id },
  });
  if (!moment) return { error: "记录不存在或无权编辑" };

  await prisma.moment.update({
    where: { id: moment.id },
    data: {
      content,
      mood,
      tags: JSON.stringify(tags),
      visibility,
      wantAgain,
      happenedAt: happenedAtRaw ? new Date(happenedAtRaw) : moment.happenedAt,
    },
  });

  revalidatePath("/home");
  revalidatePath(`/moments/${moment.id}`);
  redirect(`/moments/${moment.id}`);
}

export async function deleteMomentAction(momentId: string) {
  const user = await requireUser();
  if (!user?.id) return;
  const membership = await getMembership(user.id);
  if (!membership) return;

  const moment = await prisma.moment.findFirst({
    where: { id: momentId, spaceId: membership.spaceId, authorId: user.id },
  });
  if (!moment) return;

  await prisma.moment.delete({ where: { id: moment.id } });
  revalidatePath("/home");
  redirect("/home");
}

export async function togglePinMomentAction(momentId: string) {
  const user = await requireUser();
  if (!user?.id) return;
  const membership = await getMembership(user.id);
  if (!membership) return;

  const moment = await prisma.moment.findFirst({
    where: {
      id: momentId,
      spaceId: membership.spaceId,
      OR: [{ visibility: "shared" }, { authorId: user.id }],
    },
  });
  if (!moment) return;

  await prisma.moment.update({
    where: { id: moment.id },
    data: { pinned: !moment.pinned },
  });
  revalidatePath("/home");
  revalidatePath(`/moments/${moment.id}`);
}

export async function generateSuggestionAction() {
  const user = await requireUser();
  if (!user?.id) redirect("/login");
  const membership = await getMembership(user.id);
  if (!membership) redirect("/onboarding");

  const space = membership.space;

  const moments = await prisma.moment.findMany({
    where: {
      spaceId: membership.spaceId,
      visibility: "shared",
    },
    orderBy: [{ pinned: "desc" }, { happenedAt: "desc" }],
    take: 30,
  });

  const openPlans = await prisma.plan.findMany({
    where: { spaceId: membership.spaceId, status: { in: ["proposed", "completed"] } },
    select: { title: true },
    take: 40,
  });

  const recentSuggestions = await prisma.suggestion.findMany({
    where: { spaceId: membership.spaceId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { feedbacks: true },
  });

  const feedbacks = recentSuggestions.flatMap((s) => {
    const items = parseSuggestionPayload(s.payload);
    return s.feedbacks.map((f) => {
      const item = items[f.itemIndex];
      return {
        action: f.action,
        reasonCodes: parseTags(f.reasonCodes),
        itemIndex: f.itemIndex,
        title: item?.title,
        tags: item?.tags ?? [],
      };
    });
  });

  let anniversarySoon = isAnniversarySoon(space.anniversaryAt);

  const items = generateSuggestions(
    moments.map((m) => ({
      content: m.content,
      mood: m.mood,
      tags: parseTags(m.tags),
      wantAgain: m.wantAgain,
      happenedAt: m.happenedAt,
      pinned: m.pinned,
    })),
    feedbacks,
    {
      budgetPref: space.budgetPref,
      blockedTitles: openPlans.map((p) => p.title),
      anniversarySoon,
    },
  );

  const suggestion = await prisma.suggestion.create({
    data: {
      spaceId: membership.spaceId,
      createdBy: user.id,
      payload: JSON.stringify(items),
      modelVersion: "rule_v1",
    },
  });

  revalidatePath("/suggestions");
  redirect(`/suggestions?id=${suggestion.id}`);
}

export async function feedbackSuggestionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!user?.id) return { error: "请先登录" };
  const membership = await getMembership(user.id);
  if (!membership) return { error: "请先加入空间" };

  const suggestionId = String(formData.get("suggestionId") ?? "");
  const itemIndex = Number(formData.get("itemIndex") ?? 0);
  const action = String(formData.get("action") ?? "");
  const reasons = formData.getAll("reasons").map(String);

  if (!["like", "dislike"].includes(action)) return { error: "无效操作" };

  const suggestion = await prisma.suggestion.findFirst({
    where: { id: suggestionId, spaceId: membership.spaceId },
  });
  if (!suggestion) return { error: "建议不存在" };

  const existing = await prisma.suggestionFeedback.findFirst({
    where: {
      suggestionId,
      userId: user.id,
      itemIndex,
    },
  });

  if (existing) {
    await prisma.suggestionFeedback.update({
      where: { id: existing.id },
      data: {
        action,
        reasonCodes: JSON.stringify(reasons),
      },
    });
  } else {
    await prisma.suggestionFeedback.create({
      data: {
        suggestionId,
        userId: user.id,
        itemIndex,
        action,
        reasonCodes: JSON.stringify(reasons),
      },
    });
  }

  revalidatePath("/suggestions");
  return { success: action === "like" ? "已记下喜欢" : "已记下反馈，下次会少推这类" };
}

export async function adoptSuggestionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!user?.id) return { error: "请先登录" };
  const membership = await getMembership(user.id);
  if (!membership) return { error: "请先加入空间" };

  const suggestionId = String(formData.get("suggestionId") ?? "");
  const itemIndex = Number(formData.get("itemIndex") ?? 0);
  const title = String(formData.get("title") ?? "").trim();
  const detail = String(formData.get("detail") ?? "").trim();
  const duration = String(formData.get("duration") ?? "");
  const budget = String(formData.get("budget") ?? "");
  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "");

  if (!title || !detail) return { error: "标题和详情不能为空" };

  const suggestion = await prisma.suggestion.findFirst({
    where: { id: suggestionId, spaceId: membership.spaceId },
  });
  if (!suggestion) return { error: "建议不存在" };

  const existingOpen = await prisma.plan.findFirst({
    where: {
      spaceId: membership.spaceId,
      title,
      status: "proposed",
    },
  });
  if (existingOpen) {
    redirect("/plans");
  }

  const existingFeedback = await prisma.suggestionFeedback.findFirst({
    where: {
      suggestionId,
      userId: user.id,
      itemIndex,
    },
  });
  if (existingFeedback) {
    await prisma.suggestionFeedback.update({
      where: { id: existingFeedback.id },
      data: { action: "adopt", reasonCodes: "[]" },
    });
  } else {
    await prisma.suggestionFeedback.create({
      data: {
        suggestionId,
        userId: user.id,
        itemIndex,
        action: "adopt",
        reasonCodes: "[]",
      },
    });
  }

  await prisma.plan.create({
    data: {
      spaceId: membership.spaceId,
      suggestionId,
      title,
      detail,
      duration: duration || null,
      budget: budget || null,
      scheduledAt: scheduledAtRaw ? new Date(scheduledAtRaw) : null,
      createdBy: user.id,
      status: "proposed",
    },
  });

  revalidatePath("/plans");
  redirect("/plans");
}

/** 从「想再来」的时刻，生成一批延续该类型的下次约会建议 */
export async function remixWantAgainAction(formData: FormData) {
  const user = await requireUser();
  if (!user?.id) redirect("/login");
  const membership = await getMembership(user.id);
  if (!membership) redirect("/onboarding");

  const momentId = String(formData.get("momentId") ?? "");
  const moment = await prisma.moment.findFirst({
    where: {
      id: momentId,
      spaceId: membership.spaceId,
      visibility: "shared",
      wantAgain: "yes",
    },
  });
  if (!moment) redirect("/home");

  const seedTags = parseTags(moment.tags);
  const snippet = moment.content.slice(0, 36);

  const openPlans = await prisma.plan.findMany({
    where: { spaceId: membership.spaceId, status: { in: ["proposed", "completed"] } },
    select: { title: true },
    take: 40,
  });

  const recentSuggestions = await prisma.suggestion.findMany({
    where: { spaceId: membership.spaceId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { feedbacks: true },
  });

  const feedbacks = recentSuggestions.flatMap((s) => {
    const items = parseSuggestionPayload(s.payload);
    return s.feedbacks.map((f) => {
      const item = items[f.itemIndex];
      return {
        action: f.action,
        reasonCodes: parseTags(f.reasonCodes),
        itemIndex: f.itemIndex,
        title: item?.title,
        tags: item?.tags ?? [],
      };
    });
  });

  const sharedMoments = await prisma.moment.findMany({
    where: { spaceId: membership.spaceId, visibility: "shared" },
    orderBy: [{ pinned: "desc" }, { happenedAt: "desc" }],
    take: 30,
  });

  const items = generateSuggestions(
    sharedMoments.map((m) => ({
      content: m.content,
      mood: m.mood,
      tags: parseTags(m.tags),
      wantAgain: m.wantAgain,
      happenedAt: m.happenedAt,
      pinned: m.pinned,
    })),
    feedbacks,
    {
      budgetPref: membership.space.budgetPref,
      blockedTitles: openPlans.map((p) => p.title),
      anniversarySoon: isAnniversarySoon(membership.space.anniversaryAt),
      seedTags,
      seedReason: `延续你们标记过「想再来」的那段：「${snippet}${moment.content.length > 36 ? "…" : ""}」`,
    },
  );

  const suggestion = await prisma.suggestion.create({
    data: {
      spaceId: membership.spaceId,
      createdBy: user.id,
      payload: JSON.stringify(items),
      modelVersion: "rule_v1_remix",
    },
  });

  revalidatePath("/suggestions");
  revalidatePath("/home");
  redirect(`/suggestions?id=${suggestion.id}&remix=1`);
}

/** 纪念日临近时，一键把仪式模板放进约会待办 */
export async function createAnniversaryPlanAction() {
  const user = await requireUser();
  if (!user?.id) redirect("/login");
  const membership = await getMembership(user.id);
  if (!membership) redirect("/onboarding");

  if (!isAnniversarySoon(membership.space.anniversaryAt)) {
    redirect("/settings");
  }

  const ritual = anniversaryRitualItem();
  const existing = await prisma.plan.findFirst({
    where: {
      spaceId: membership.spaceId,
      title: ritual.title,
      status: "proposed",
    },
  });
  if (existing) {
    redirect("/plans");
  }

  await prisma.plan.create({
    data: {
      spaceId: membership.spaceId,
      title: ritual.title,
      detail: ritual.detail,
      duration: ritual.duration,
      budget: ritual.budget,
      createdBy: user.id,
      status: "proposed",
    },
  });

  revalidatePath("/plans");
  revalidatePath("/home");
  redirect("/plans");
}

export async function createPlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!user?.id) return { error: "请先登录" };
  const membership = await getMembership(user.id);
  if (!membership) return { error: "请先加入空间" };

  const title = String(formData.get("title") ?? "").trim();
  const detail = String(formData.get("detail") ?? "").trim();
  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "");

  if (!title) return { error: "写一个约会标题" };
  if (!detail) return { error: "简单写一下打算怎么做" };

  await prisma.plan.create({
    data: {
      spaceId: membership.spaceId,
      title,
      detail,
      scheduledAt: scheduledAtRaw ? new Date(scheduledAtRaw) : null,
      createdBy: user.id,
      status: "proposed",
    },
  });

  revalidatePath("/plans");
  redirect("/plans");
}

export async function updatePlanScheduleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!user?.id) return { error: "请先登录" };
  const membership = await getMembership(user.id);
  if (!membership) return { error: "请先加入空间" };

  const planId = String(formData.get("planId") ?? "");
  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "");

  const plan = await prisma.plan.findFirst({
    where: { id: planId, spaceId: membership.spaceId, status: "proposed" },
  });
  if (!plan) return { error: "约会不存在或已处理" };

  await prisma.plan.update({
    where: { id: plan.id },
    data: { scheduledAt: scheduledAtRaw ? new Date(scheduledAtRaw) : null },
  });
  revalidatePath("/plans");
  revalidatePath("/home");
  return { success: scheduledAtRaw ? "已更新约会时间" : "已清除约会时间" };
}

export async function completePlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!user?.id) return { error: "请先登录" };
  const membership = await getMembership(user.id);
  if (!membership) return { error: "请先加入空间" };

  const planId = String(formData.get("planId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const mood = sanitizeMood(String(formData.get("mood") ?? "happy")) ?? "happy";
  const wantAgain = sanitizeWantAgain(String(formData.get("wantAgain") ?? ""));
  const happenedAtRaw = String(formData.get("happenedAt") ?? "");

  const plan = await prisma.plan.findFirst({
    where: { id: planId, spaceId: membership.spaceId, status: "proposed" },
  });
  if (!plan) return { error: "约会不存在或已处理" };

  const content =
    note ||
    `完成了「${plan.title}」。${plan.detail.slice(0, 80)}${plan.detail.length > 80 ? "…" : ""}`;

  const happenedAt = happenedAtRaw
    ? new Date(happenedAtRaw)
    : plan.scheduledAt ?? new Date();

  const tags = ["约会回流"];
  if (plan.budget) tags.push("约会");

  const moment = await prisma.$transaction(async (tx) => {
    await tx.plan.update({
      where: { id: plan.id },
      data: { status: "completed", completedAt: new Date() },
    });
    return tx.moment.create({
      data: {
        spaceId: membership.spaceId,
        authorId: user.id,
        content,
        mood,
        tags: JSON.stringify(tags),
        visibility: "shared",
        wantAgain,
        sourcePlanId: plan.id,
        happenedAt,
      },
    });
  });

  revalidatePath("/plans");
  revalidatePath("/home");
  redirect(`/home?settled=1&moment=${moment.id}`);
}

export async function cancelPlanAction(planId: string) {
  const user = await requireUser();
  if (!user?.id) return;
  const membership = await getMembership(user.id);
  if (!membership) return;

  await prisma.plan.updateMany({
    where: { id: planId, spaceId: membership.spaceId, status: "proposed" },
    data: { status: "cancelled" },
  });
  revalidatePath("/plans");
}

export async function createSyncQuestionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!user?.id) return { error: "请先登录" };
  const membership = await getMembership(user.id);
  if (!membership) return { error: "请先加入空间" };

  const prompt = String(formData.get("prompt") ?? "").trim();
  if (!prompt) return { error: "先写一个问题" };
  if (prompt.length > 120) return { error: "问题请控制在 120 字内" };

  await prisma.syncQuestion.create({
    data: {
      spaceId: membership.spaceId,
      prompt,
      createdBy: user.id,
    },
  });
  revalidatePath("/magic");
  return { success: "默契题已发出，等双方都回答后揭晓" };
}

export async function answerSyncQuestionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!user?.id) return { error: "请先登录" };
  const membership = await getMembership(user.id);
  if (!membership) return { error: "请先加入空间" };

  const questionId = String(formData.get("questionId") ?? "");
  const answer = String(formData.get("answer") ?? "").trim();
  if (!answer) return { error: "写一下你的答案" };
  if (answer.length > 80) return { error: "答案请控制在 80 字内" };

  const question = await prisma.syncQuestion.findFirst({
    where: { id: questionId, spaceId: membership.spaceId },
  });
  if (!question) return { error: "问题不存在" };

  const existing = await prisma.syncAnswer.findUnique({
    where: {
      questionId_userId: { questionId, userId: user.id },
    },
  });
  if (existing) {
    await prisma.syncAnswer.update({
      where: { id: existing.id },
      data: { answer },
    });
  } else {
    await prisma.syncAnswer.create({
      data: { questionId, userId: user.id, answer },
    });
  }

  revalidatePath("/magic");
  return { success: "答案已提交（对方回答前不会看到）" };
}

export async function createSurpriseNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!user?.id) return { error: "请先登录" };
  const membership = await getMembership(user.id);
  if (!membership) return { error: "请先加入空间" };

  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "写一句想给 TA 的话" };
  if (content.length > 200) return { error: "请控制在 200 字内" };

  await prisma.surpriseNote.create({
    data: {
      spaceId: membership.spaceId,
      authorId: user.id,
      content,
    },
  });
  revalidatePath("/magic");
  return { success: "惊喜便签已藏好，等 TA 来拆" };
}

export async function revealSurpriseNoteAction(noteId: string) {
  const user = await requireUser();
  if (!user?.id) return;
  const membership = await getMembership(user.id);
  if (!membership) return;

  const note = await prisma.surpriseNote.findFirst({
    where: {
      id: noteId,
      spaceId: membership.spaceId,
      isRevealed: false,
      NOT: { authorId: user.id },
    },
  });
  if (!note) return;

  await prisma.surpriseNote.update({
    where: { id: note.id },
    data: { isRevealed: true, revealedAt: new Date() },
  });
  revalidatePath("/magic");
}

export async function createWishAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!user?.id) return { error: "请先登录" };
  const membership = await getMembership(user.id);
  if (!membership) return { error: "请先加入空间" };

  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "写一个想一起做的愿望" };
  if (content.length > 120) return { error: "愿望请控制在 120 字内" };

  await prisma.wishItem.create({
    data: {
      spaceId: membership.spaceId,
      authorId: user.id,
      content,
    },
  });
  revalidatePath("/magic");
  return { success: "已投进愿望罐" };
}

export async function toggleWishDoneAction(wishId: string) {
  const user = await requireUser();
  if (!user?.id) return;
  const membership = await getMembership(user.id);
  if (!membership) return;

  const wish = await prisma.wishItem.findFirst({
    where: { id: wishId, spaceId: membership.spaceId },
  });
  if (!wish) return;

  await prisma.wishItem.update({
    where: { id: wish.id },
    data: {
      isDone: !wish.isDone,
      doneAt: wish.isDone ? null : new Date(),
    },
  });
  revalidatePath("/magic");
}

export async function submitDailyMoodAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!user?.id) return { error: "请先登录" };
  const membership = await getMembership(user.id);
  if (!membership) return { error: "请先加入空间" };

  const mood = sanitizeMood(String(formData.get("mood") ?? ""));
  const note = String(formData.get("note") ?? "").trim().slice(0, 80) || null;
  if (!mood) return { error: "选一个心情" };

  const { todayKey } = await import("@/lib/magic");
  const day = todayKey();

  await prisma.dailyMood.upsert({
    where: {
      spaceId_userId_day: {
        spaceId: membership.spaceId,
        userId: user.id,
        day,
      },
    },
    create: {
      spaceId: membership.spaceId,
      userId: user.id,
      day,
      mood,
      note,
    },
    update: { mood, note },
  });

  revalidatePath("/magic");
  return { success: "今日心情已记下" };
}

export async function createComplimentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!user?.id) return { error: "请先登录" };
  const membership = await getMembership(user.id);
  if (!membership) return { error: "请先加入空间" };

  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "写一句夸奖吧" };
  if (content.length > 120) return { error: "请控制在 120 字内" };

  await prisma.compliment.create({
    data: {
      spaceId: membership.spaceId,
      authorId: user.id,
      content,
    },
  });
  revalidatePath("/magic");
  return { success: "已贴上夸夸墙" };
}
