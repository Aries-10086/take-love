import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { AppNav } from "@/components/app-nav";
import { StatusSubmit } from "@/components/status-submit";
import {
  adoptSuggestionAction,
  feedbackSuggestionAction,
  generateSuggestionAction,
} from "@/lib/actions";
import { auth } from "@/lib/auth";
import { DISLIKE_REASONS } from "@/lib/constants";
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
      })
    : await prisma.suggestion.findFirst({
        where: { spaceId: membership.spaceId },
        orderBy: { createdAt: "desc" },
      });

  const items = suggestion ? parseSuggestionPayload(suggestion.payload) : [];

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
              <StatusSubmit label="生成建议" className="btn btn-primary" />
            </form>
          </div>
        </div>
      ) : (
        <section className="panel">
          {items.map((item, index) => (
            <article key={`${item.title}-${index}`} className="suggestion-card">
              <ActionForm
                action={adoptSuggestionAction}
                submitLabel="就这个"
                submitClassName="btn btn-accent"
              >
                <input type="hidden" name="suggestionId" value={suggestion.id} />
                <input type="hidden" name="itemIndex" value={index} />
                <div className="field">
                  <label htmlFor={`title-${index}`}>标题（可改）</label>
                  <input
                    id={`title-${index}`}
                    name="title"
                    defaultValue={item.title}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor={`detail-${index}`}>怎么做（可改）</label>
                  <textarea
                    id={`detail-${index}`}
                    name="detail"
                    defaultValue={item.detail}
                    required
                  />
                </div>
                <input type="hidden" name="duration" value={item.duration} />
                <input type="hidden" name="budget" value={item.budget} />
                <div className="meta-line">
                  <span>时长 {item.duration}</span>
                  <span>预算 {item.budget}</span>
                </div>
                <p>
                  <strong>为什么适合你们：</strong>
                  {item.reason}
                </p>
                <div className="moment-footer">
                  {item.tags.map((tag) => (
                    <span key={tag} className="chip soft">
                      {tag}
                    </span>
                  ))}
                </div>
              </ActionForm>

              <div className="inline-actions" style={{ marginTop: "0.75rem" }}>
                <ActionForm
                  action={feedbackSuggestionAction}
                  submitLabel="喜欢"
                  submitClassName="btn btn-ghost"
                >
                  <input type="hidden" name="suggestionId" value={suggestion.id} />
                  <input type="hidden" name="itemIndex" value={index} />
                  <input type="hidden" name="action" value="like" />
                </ActionForm>
              </div>

              <details style={{ marginTop: "0.75rem" }}>
                <summary style={{ cursor: "pointer", color: "var(--ink-soft)" }}>
                  不合适？告诉原因
                </summary>
                <ActionForm
                  action={feedbackSuggestionAction}
                  className="stack"
                  submitLabel="提交反馈"
                  submitClassName="btn btn-ghost"
                >
                  <input type="hidden" name="suggestionId" value={suggestion.id} />
                  <input type="hidden" name="itemIndex" value={index} />
                  <input type="hidden" name="action" value="dislike" />
                  <div className="choice-row" style={{ marginTop: "0.6rem" }}>
                    {DISLIKE_REASONS.map((reason) => (
                      <label key={reason.value} className="choice">
                        <input type="checkbox" name="reasons" value={reason.value} />
                        {reason.label}
                      </label>
                    ))}
                  </div>
                </ActionForm>
              </details>
            </article>
          ))}
        </section>
      )}

      <AppNav current="/suggestions" />
    </main>
  );
}
