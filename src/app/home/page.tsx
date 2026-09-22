import Link from "next/link";
import { redirect } from "next/navigation";
import { AnniversaryBanner } from "@/components/anniversary-banner";
import { AppNav } from "@/components/app-nav";
import { CopyInviteButton } from "@/components/copy-invite";
import { CoupleHero } from "@/components/couple-hero";
import { DailyCheckin } from "@/components/daily-checkin";
import { HomeFilter } from "@/components/home-filter";
import { HomeFlash } from "@/components/home-flash";
import { MomentCard } from "@/components/moment-card";
import { NextPlanCard } from "@/components/next-plan-card";
import { WeeklyLetter } from "@/components/weekly-letter";
import { auth } from "@/lib/auth";
import { buildLoveReport } from "@/lib/magic";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/space";
import { daysUntilAnniversary, isAnniversarySoon, parseTags } from "@/lib/suggestions";
import { formatRelativeZh, isSameCalendarDay } from "@/lib/time";

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

  const [moments, plans] = await Promise.all([
    prisma.moment.findMany({
      where: {
        spaceId: membership.spaceId,
        OR: [{ visibility: "shared" }, { authorId: session.user.id }],
        ...(mood ? { mood } : {}),
      },
      include: { author: { select: { name: true } } },
      orderBy: [{ pinned: "desc" }, { happenedAt: "desc" }],
      take: 150,
    }),
    prisma.plan.findMany({
      where: { spaceId: membership.spaceId },
      select: {
        id: true,
        title: true,
        detail: true,
        status: true,
        scheduledAt: true,
        completedAt: true,
        createdAt: true,
      },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
      take: 80,
    }),
  ]);

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

  const openPlans = plans
    .filter((p) => p.status === "proposed")
    .sort((a, b) => {
      const at = a.scheduledAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bt = b.scheduledAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (at !== bt) return at - bt;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  const openPlanCount = openPlans.length;
  const nextPlan = openPlans[0]
    ? {
        id: openPlans[0].id,
        title: openPlans[0].title,
        detail: openPlans[0].detail,
        scheduledAt: openPlans[0].scheduledAt,
      }
    : null;

  const weekCompleted = plans.filter(
    (p) =>
      p.status === "completed" &&
      p.completedAt &&
      p.completedAt >= weekStart,
  ).length;

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

  const partnerLatest = partner
    ? moments
        .filter((m) => m.authorId === partner.userId && m.visibility === "shared")
        .sort((a, b) => b.happenedAt.getTime() - a.happenedAt.getTime())[0] ?? null
    : null;

  const presenceLine = waitingPartner
    ? "还在等另一半加入 · 邀请码已备好"
    : partnerLatest
      ? `${partner.user.name} ${formatRelativeZh(partnerLatest.happenedAt)}写了时刻`
      : `${partner?.user.name ?? "TA"} 还没写下第一条共享时刻`;

  const hasMomentToday = moments.some((m) =>
    isSameCalendarDay(m.happenedAt, new Date()),
  );
  const showCheckin = !waitingPartner && !hasMomentToday && !flashKind;

  const weekNote =
    weekCount > 0
      ? `最近 7 天写下了 ${weekCount} 段相处`
      : hasHistory
        ? "这周还没新写的，随手记一句也很好"
        : "还没有写下相处，从今天开始";

  const earliestShared = moments
    .filter((m) => m.visibility === "shared")
    .reduce<Date | null>((earliest, m) => {
      if (!earliest || m.happenedAt < earliest) return m.happenedAt;
      return earliest;
    }, null);

  const since =
    membership.space.anniversaryAt ??
    earliestShared ??
    membership.space.createdAt;

  const daysTogether = Math.max(
    1,
    Math.round(
      (Date.now() -
        new Date(
          since.getFullYear(),
          since.getMonth(),
          since.getDate(),
        ).getTime()) /
        86400000,
    ) + 1,
  );

  const pinned = filtered.filter((m) => m.pinned);
  const rest = filtered.filter((m) => !m.pinned);

  const anniversarySoon = isAnniversarySoon(membership.space.anniversaryAt);
  const anniversaryDays = membership.space.anniversaryAt
    ? daysUntilAnniversary(membership.space.anniversaryAt)
    : null;

  const sharedForReport = moments.filter((m) => m.visibility === "shared");
  const report =
    sharedForReport.length > 0
      ? buildLoveReport({
          spaceName: membership.space.name,
          meName: me?.user.name ?? session.user.name ?? "我",
          partnerName: partner?.user.name,
          daysTogether,
          moments: sharedForReport.map((m) => ({
            content: m.content,
            mood: m.mood,
            tags: m.tags,
            wantAgain: m.wantAgain,
            happenedAt: m.happenedAt,
            authorName: m.author.name,
          })),
          plans: plans.map((p) => ({
            title: p.title,
            status: p.status,
            completedAt: p.completedAt,
          })),
        })
      : null;

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
        presenceLine={presenceLine}
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

      {waitingPartner ? (
        <section className="invite-banner">
          <div>
            <p className="week-note" style={{ marginBottom: "0.35rem" }}>
              {welcome === "1" || flashKind === "welcome"
                ? "空间已创建。把邀请发给另一半，再一起写下第一条时刻："
                : "还在等待另一半加入："}
            </p>
            <p className="invite-code">{membership.space.inviteCode}</p>
          </div>
          <div className="stack" style={{ gap: "0.5rem" }}>
            <CopyInviteButton
              code={membership.space.inviteCode}
              spaceName={membership.space.name}
            />
            <Link className="btn btn-accent" href="/moments/new">
              先写下第一条
            </Link>
          </div>
        </section>
      ) : null}

      {!waitingPartner && anniversarySoon && anniversaryDays != null ? (
        <AnniversaryBanner daysLeft={anniversaryDays} />
      ) : null}

      <DailyCheckin visible={showCheckin} />

      {!flashKind ? (
        <NextPlanCard plan={nextPlan} partnerWaiting={waitingPartner} />
      ) : null}

      {report && !waitingPartner ? (
        <WeeklyLetter
          title={report.title}
          body={report.body}
          topTag={report.stats.topTag}
          topMood={report.stats.topMood}
          weekMoments={report.stats.weekMoments}
        />
      ) : null}

      <div className="section-head">
        <h2>回忆</h2>
        <p>按时间回看你们写下的相处</p>
      </div>

      {!hasNoMoments ? <HomeFilter mood={mood} tag={tag} q={q} /> : null}

      {filterEmpty ? (
        <div className="empty empty-craft">
          {hasNoMoments ? (
            <>
              <p className="empty-title">还没有共同记忆</p>
              <p className="empty-body">用一句话写下今天的相处，从这里开始属于你们的时光。</p>
              <div className="inline-actions" style={{ marginTop: "1rem" }}>
                <Link className="btn btn-accent" href="/moments/new">
                  记下第一条
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="empty-title">没有符合筛选的记录</p>
              <p className="empty-body">换个心情或标签再看看，或者清掉筛选。</p>
              <div className="inline-actions" style={{ marginTop: "1rem" }}>
                <Link className="btn btn-ghost" href="/home">
                  清除筛选
                </Link>
              </div>
            </>
          )}
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
