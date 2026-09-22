import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { StatusSubmit } from "@/components/status-submit";
import { SuggestionItemCard } from "@/components/suggestion-item";
import { generateSuggestionAction } from "@/lib/actions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/space";
import { parseSuggestionPayload } from "@/lib/suggestions";

export default async function SuggestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; remix?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const membership = await getMembership(session.user.id);
  if (!membership) redirect("/onboarding");

  const { id, remix } = await searchParams;
  const [suggestion, openPlanCount] = await Promise.all([
    id
      ? prisma.suggestion.findFirst({
          where: { id, spaceId: membership.spaceId },
          include: { feedbacks: true },
        })
      : prisma.suggestion.findFirst({
          where: { spaceId: membership.spaceId },
          orderBy: { createdAt: "desc" },
          include: { feedbacks: true },
        }),
    prisma.plan.count({
      where: { spaceId: membership.spaceId, status: "proposed" },
    }),
  ]);

  const items = suggestion ? parseSuggestionPayload(suggestion.payload) : [];
  const myFeedback = new Map<number, string>();
  const partnerFeedback = new Map<number, string>();
  const partner = membership.space.members.find((m) => m.userId !== session.user.id);

  if (suggestion) {
    for (const fb of suggestion.feedbacks) {
      if (fb.userId === session.user.id) {
        myFeedback.set(fb.itemIndex, fb.action);
      } else {
        partnerFeedback.set(fb.itemIndex, fb.action);
      }
    }
  }

  const mutualCount = items.filter((_, index) => {
    const mine = myFeedback.get(index);
    const theirs = partnerFeedback.get(index);
    const iLike = mine === "like" || mine === "adopt";
    const theyLike = theirs === "like" || theirs === "adopt";
    return Boolean(partner && iLike && theyLike);
  }).length;

  return (
    <main className="shell">
      <div className="page-head">
        <div>
          <p className="brand-mark">
            捡爱 <span>建议</span>
          </p>
          <h1>下一次一起做什么</h1>
          <p className="lede">
            {remix === "1"
              ? "已按「想再来」的那次相处，续出几条可执行的下次约会。"
              : partner
                ? "根据共享记录给出约会提案。两人都点喜欢，就会标成「你们都心动了」。"
                : "根据你们的共享记录，给出具体可执行的约会。"}
          </p>
        </div>
        <form action={generateSuggestionAction}>
          <StatusSubmit
            label={suggestion ? "再生成一批" : "生成建议"}
            pendingLabel="生成中…"
            className="btn btn-primary"
          />
        </form>
      </div>

      {mutualCount > 0 ? (
        <p className="mutual-summary">
          本批有 {mutualCount} 条你们都心动了——订成约会，就差动身。
        </p>
      ) : null}

      {!suggestion || items.length === 0 ? (
        <div className="empty">
          还没有建议。先多记几条双方可见的时刻，或直接生成一批起步提案。
          <div className="inline-actions" style={{ marginTop: "1rem" }}>
            <Link className="btn btn-ghost" href="/moments/new">
              先去记一条
            </Link>
            <form action={generateSuggestionAction}>
              <StatusSubmit
                label="生成建议"
                pendingLabel="生成中…"
                className="btn btn-primary"
              />
            </form>
          </div>
        </div>
      ) : (
        <section className="panel">
          {items.map((item, index) => (
            <SuggestionItemCard
              key={`${item.title}-${index}`}
              suggestionId={suggestion.id}
              index={index}
              item={item}
              feedbackAction={myFeedback.get(index) ?? null}
              partnerAction={partnerFeedback.get(index) ?? null}
              partnerName={partner?.user.name}
              hasPartner={Boolean(partner)}
            />
          ))}
        </section>
      )}

      <AppNav current="/suggestions" openPlanCount={openPlanCount} />
    </main>
  );
}
