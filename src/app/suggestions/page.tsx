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
  searchParams: Promise<{ id?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const membership = await getMembership(session.user.id);
  if (!membership) redirect("/onboarding");

  const { id } = await searchParams;
  const suggestion = id
    ? await prisma.suggestion.findFirst({
        where: { id, spaceId: membership.spaceId },
        include: { feedbacks: true },
      })
    : await prisma.suggestion.findFirst({
        where: { spaceId: membership.spaceId },
        orderBy: { createdAt: "desc" },
        include: { feedbacks: true },
      });

  const items = suggestion ? parseSuggestionPayload(suggestion.payload) : [];
  const myFeedback = new Map<number, string>();
  if (suggestion) {
    for (const fb of suggestion.feedbacks) {
      if (fb.userId === session.user.id) {
        myFeedback.set(fb.itemIndex, fb.action);
      }
    }
  }

  const openPlanCount = await prisma.plan.count({
    where: { spaceId: membership.spaceId, status: "proposed" },
  });

  return (
    <main className="shell">
      <div className="page-head">
        <div>
          <p className="brand-mark">
            捡爱 <span>建议</span>
          </p>
          <h1>下一次一起做什么</h1>
          <p className="lede">根据你们的共享记录，给出具体可执行的约会。</p>
        </div>
        <form action={generateSuggestionAction}>
          <StatusSubmit
            label={suggestion ? "再生成一批" : "生成建议"}
            pendingLabel="生成中…"
            className="btn btn-primary"
          />
        </form>
      </div>

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
            />
          ))}
        </section>
      )}

      <AppNav current="/suggestions" openPlanCount={openPlanCount} />
    </main>
  );
}
