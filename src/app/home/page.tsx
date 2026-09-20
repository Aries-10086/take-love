import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { CopyInviteButton } from "@/components/copy-invite";
import { CoupleHero } from "@/components/couple-hero";
import { HomeFilter } from "@/components/home-filter";
import { HomeFlash } from "@/components/home-flash";
import { MomentCard } from "@/components/moment-card";
import { StatusSubmit } from "@/components/status-submit";
import { generateSuggestionAction } from "@/lib/actions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/space";
import { parseTags } from "@/lib/suggestions";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    mood?: string;
    tag?: string;
    q?: string;
    welcome?: string;
    settled?: string;
    saved?: string;
    joined?: string;
    moment?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await getMembership(session.user.id);
  if (!membership) redirect("/onboarding");

  const { mood, tag, q, welcome, settled, saved, joined, moment } = await searchParams;

  const moments = await prisma.moment.findMany({
    where: {
      spaceId: membership.spaceId,
      OR: [{ visibility: "shared" }, { authorId: session.user.id }],
      ...(mood ? { mood } : {}),
    },
    include: { author: { select: { name: true } } },
    orderBy: [{ pinned: "desc" }, { happenedAt: "desc" }],
  });

  let filtered = tag
    ? moments.filter((m) => parseTags(m.tags).includes(tag))
    : moments;

  if (q?.trim()) {
    const needle = q.trim().toLowerCase();
    filtered = filtered.filter((m) => {
      const tags = parseTags(m.tags).join(" ");
      return `${m.content} ${tags}`.toLowerCase().includes(needle);
    });
  }

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekCount = moments.filter((m) => m.happenedAt >= weekStart).length;
  const hasHistory = moments.length > 0;

  const openPlans = await prisma.plan.findMany({
    where: { spaceId: membership.spaceId, status: "proposed" },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
  });
  const openPlanCount = openPlans.length;

  const weekCompleted = await prisma.plan.count({
    where: {
      spaceId: membership.spaceId,
      status: "completed",
      completedAt: { gte: weekStart },
    },
  });

  const wantAgainWeek = moments.filter(
    (m) => m.happenedAt >= weekStart && m.wantAgain === "yes",
  ).length;

  const me = membership.space.members.find((m) => m.userId === session.user.id);
  const partner = membership.space.members.find((m) => m.userId !== session.user.id);
  const waitingPartner = !partner;
  const hasNoMoments = moments.length === 0;
  const filterEmpty = filtered.length === 0;

  const flashKind = settled
    ? "settled"
    : saved
      ? "saved"
      : joined
        ? "joined"
        : welcome
          ? "welcome"
          : null;

  const weekNote =
    weekCount > 0
      ? `最近 7 天写下了 ${weekCount} 段相处`
      : hasHistory
        ? "这周还没新写的，随手记一句也很好"
        : "还没有写下相处，从今天开始";

  const earliestShared = await prisma.moment.findFirst({
    where: { spaceId: membership.spaceId, visibility: "shared" },
    orderBy: { happenedAt: "asc" },
    select: { happenedAt: true },
  });
  const since =
    membership.space.anniversaryAt ??
    earliestShared?.happenedAt ??
    membership.space.createdAt;

  const pinned = filtered.filter((m) => m.pinned);
  const rest = filtered.filter((m) => !m.pinned);

  const overdue = openPlans.filter(
    (p) => p.scheduledAt && p.scheduledAt.getTime() < Date.now(),
  );

  return (
    <main className="shell">
      <CoupleHero
        spaceName={membership.space.name}
        meName={me?.user.name ?? session.user.name ?? "我"}
        partnerName={partner?.user.name}
        since={since}
        momentCount={moments.length}
        openPlanCount={openPlanCount}
        weekNote={weekNote}
      />

      <section className="week-summary">
        <div>
          <strong>{weekCount}</strong>
          <span>本周时刻</span>
        </div>
        <div>
          <strong>{weekCompleted}</strong>
          <span>完成约会</span>
        </div>
        <div>
          <strong>{wantAgainWeek}</strong>
          <span>想再来</span>
        </div>
      </section>

      {flashKind ? (
        <HomeFlash
          kind={flashKind}
          momentHref={moment ? `/moments/${moment}` : undefined}
        />
      ) : null}

      {(welcome === "1" || waitingPartner) && !flashKind ? (
        <section className="invite-banner">
          <div>
            <p className="week-note" style={{ marginBottom: "0.35rem" }}>
              {welcome === "1" ? "空间已创建。把邀请发给另一半：" : "还在等待另一半加入："}
            </p>
            <p className="invite-code">{membership.space.inviteCode}</p>
          </div>
          <div className="stack" style={{ gap: "0.5rem" }}>
            <CopyInviteButton
              code={membership.space.inviteCode}
              spaceName={membership.space.name}
            />
            <Link className="btn btn-ghost" href="/settings">
              空间设置
            </Link>
          </div>
        </section>
      ) : null}

      {waitingPartner && flashKind === "welcome" ? (
        <section className="invite-banner">
          <div>
            <p className="week-note" style={{ marginBottom: "0.35rem" }}>
              邀请码
            </p>
            <p className="invite-code">{membership.space.inviteCode}</p>
          </div>
          <CopyInviteButton
            code={membership.space.inviteCode}
            spaceName={membership.space.name}
          />
        </section>
      ) : null}

      {openPlanCount > 0 && !waitingPartner && !flashKind ? (
        <section className="loop-banner">
          <p>
            {overdue.length > 0
              ? `有 ${overdue.length} 个约会已过计划时间，记得完成或改期。`
              : "你们有待完成的约会。做完后记得点完成，它会变成新的时刻。"}
            {openPlans[0]?.scheduledAt
              ? ` 最近一次：${format(openPlans[0].scheduledAt, "M月d日 HH:mm", { locale: zhCN })}`
              : ""}
          </p>
          <Link className="btn btn-ghost" href="/plans">
            去看看
          </Link>
        </section>
      ) : null}

      <div className="section-head">
        <h2>回忆</h2>
        <p>按时间回看你们写下的相处</p>
      </div>

      {!hasNoMoments ? <HomeFilter mood={mood} tag={tag} q={q} /> : null}

      {filterEmpty ? (
        <div className="empty">
          {hasNoMoments
            ? "还没有记录。先写下今天的一句相处，后面的建议会更懂你们。"
            : "没有符合筛选的记录。"}
          <div className="inline-actions" style={{ marginTop: "1rem" }}>
            {hasNoMoments ? (
              <Link className="btn btn-accent" href="/moments/new">
                写下第一条
              </Link>
            ) : (
              <Link className="btn btn-ghost" href="/home">
                清除筛选
              </Link>
            )}
            <form action={generateSuggestionAction}>
              <StatusSubmit
                label="先看看建议"
                pendingLabel="生成中…"
                className="btn btn-ghost"
              />
            </form>
          </div>
        </div>
      ) : (
        <>
          {pinned.length > 0 ? (
            <section className="timeline pinned-block">
              <p className="pinned-label">置顶</p>
              {pinned.map((m) => (
                <MomentCard
                  key={m.id}
                  id={m.id}
                  content={m.content}
                  mood={m.mood}
                  tags={m.tags}
                  visibility={m.visibility}
                  happenedAt={m.happenedAt}
                  authorName={m.author.name}
                  wantAgain={m.wantAgain}
                  pinned={m.pinned}
                />
              ))}
            </section>
          ) : null}
          <section className="timeline">
            {rest.map((m) => (
              <MomentCard
                key={m.id}
                id={m.id}
                content={m.content}
                mood={m.mood}
                tags={m.tags}
                visibility={m.visibility}
                happenedAt={m.happenedAt}
                authorName={m.author.name}
                wantAgain={m.wantAgain}
                pinned={m.pinned}
              />
            ))}
          </section>
        </>
      )}

      <AppNav current="/home" openPlanCount={openPlanCount} />
    </main>
  );
}
