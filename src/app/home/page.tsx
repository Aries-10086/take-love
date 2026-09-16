import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { CopyInviteButton } from "@/components/copy-invite";
import { MomentCard } from "@/components/moment-card";
import { StatusSubmit } from "@/components/status-submit";
import { generateSuggestionAction } from "@/lib/actions";
import { auth } from "@/lib/auth";
import { MOODS, TAGS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/space";
import { parseTags } from "@/lib/suggestions";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ mood?: string; tag?: string; welcome?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await getMembership(session.user.id);
  if (!membership) redirect("/onboarding");

  const { mood, tag, welcome } = await searchParams;

  const moments = await prisma.moment.findMany({
    where: {
      spaceId: membership.spaceId,
      OR: [{ visibility: "shared" }, { authorId: session.user.id }],
      ...(mood ? { mood } : {}),
    },
    include: { author: { select: { name: true } } },
    orderBy: { happenedAt: "desc" },
  });

  const filtered = tag
    ? moments.filter((m) => parseTags(m.tags).includes(tag))
    : moments;

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekCount = moments.filter((m) => m.happenedAt >= weekStart).length;
  const partner = membership.space.members.find((m) => m.userId !== session.user.id);
  const waitingPartner = !partner;

  return (
    <main className="shell">
      <div className="page-head">
        <div>
          <p className="brand-mark">
            {membership.space.name}{" "}
            <span>{partner ? `与 ${partner.user.name}` : "等待另一半"}</span>
          </p>
          <h1>我们的时光</h1>
          <p className="week-note">最近 7 天写下了 {weekCount} 段相处。</p>
        </div>
        <div className="inline-actions">
          <Link className="btn btn-primary" href="/moments/new">
            记一条
          </Link>
          <form action={generateSuggestionAction}>
            <StatusSubmit label="要建议" className="btn btn-ghost" />
          </form>
        </div>
      </div>

      {(welcome === "1" || waitingPartner) && (
        <section className="invite-banner">
          <div>
            <p className="week-note" style={{ marginBottom: "0.35rem" }}>
              {welcome === "1" ? "空间已创建。把邀请码发给另一半：" : "还在等待另一半加入："}
            </p>
            <p className="invite-code">{membership.space.inviteCode}</p>
          </div>
          <div className="inline-actions">
            <CopyInviteButton code={membership.space.inviteCode} />
            <Link className="btn btn-ghost" href="/settings">
              空间设置
            </Link>
          </div>
        </section>
      )}

      <form className="filter-bar" method="get">
        <label className="sr-only" htmlFor="mood">
          心情筛选
        </label>
        <select id="mood" name="mood" defaultValue={mood ?? ""}>
          <option value="">全部心情</option>
          {MOODS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="tag">
          标签筛选
        </label>
        <select id="tag" name="tag" defaultValue={tag ?? ""}>
          <option value="">全部标签</option>
          {TAGS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <button className="btn btn-ghost" type="submit">
          筛选
        </button>
        {(mood || tag) && (
          <Link className="btn btn-ghost" href="/home">
            清除
          </Link>
        )}
      </form>

      {filtered.length === 0 ? (
        <div className="empty">
          还没有记录。先写下今天的一句相处，后面的建议会更懂你们。
        </div>
      ) : (
        <section>
          {filtered.map((moment) => (
            <MomentCard
              key={moment.id}
              id={moment.id}
              content={moment.content}
              mood={moment.mood}
              tags={moment.tags}
              visibility={moment.visibility}
              happenedAt={moment.happenedAt}
              authorName={moment.author.name}
            />
          ))}
        </section>
      )}

      <AppNav current="/home" />
    </main>
  );
}
