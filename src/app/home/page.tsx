import Link from "next/link";
import { redirect } from "next/navigation";
import { AnniversaryBanner } from "@/components/anniversary-banner";
import { AppNav } from "@/components/app-nav";
import { CopyInviteButton } from "@/components/copy-invite";
import { CoupleHero } from "@/components/couple-hero";
import { HomeFilter } from "@/components/home-filter";
import { HomeFlash } from "@/components/home-flash";
import { MomentCard } from "@/components/moment-card";
import { NextPlanCard } from "@/components/next-plan-card";
import { StatusSubmit } from "@/components/status-submit";
import { WeeklyLetter } from "@/components/weekly-letter";
import { generateSuggestionAction } from "@/lib/actions";
import { auth } from "@/lib/auth";
import { buildLoveReport } from "@/lib/magic";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/space";
import { daysUntilAnniversary, isAnniversarySoon, parseTags } from "@/lib/suggestions";

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
  const nextPlan = openPlans[0] ?? null;

  const allPlans = await prisma.plan.findMany({
    where: { spaceId: membership.spaceId },
    select: { title: true, status: true, completedAt: true },
    take: 80,
  });

  const weekCompleted = allPlans.filter(
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
          plans: allPlans,
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

      {!waitingPartner && anniversarySoon && anniversaryDays != null ? (
        <AnniversaryBanner daysLeft={anniversaryDays} />
      ) : null}

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
