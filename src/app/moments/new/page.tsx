import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { AppNav } from "@/components/app-nav";
import { CharCount } from "@/components/char-count";
import { createMomentAction } from "@/lib/actions";
import { auth } from "@/lib/auth";
import { MOODS, TAGS, WANT_AGAIN } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/space";

export default async function NewMomentPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const membership = await getMembership(session.user.id);
  if (!membership) redirect("/onboarding");

  const openPlanCount = await prisma.plan.count({
    where: { spaceId: membership.spaceId, status: "proposed" },
  });

  return (
    <main className="shell">
      <div className="page-head">
        <div>
          <p className="brand-mark">
            捡爱 <span>记录</span>
          </p>
          <h1>记一条时刻</h1>
          <p className="lede">一句话、一个心情，再顺手点一下还想不想再来。</p>
        </div>
        <Link className="btn btn-ghost" href="/home">
          返回
        </Link>
      </div>

      <div className="panel">
        <ActionForm
          action={createMomentAction}
          submitLabel="保存这条时刻"
          submitClassName="btn btn-accent btn-block"
        >
          <div className="field">
            <label htmlFor="content">今天的相处（建议 200 字内）</label>
            <CharCount max={200} name="content" />
          </div>

          <div className="field">
            <label>心情</label>
            <div className="choice-row">
              {MOODS.map((mood, index) => (
                <label key={mood.value} className="choice">
                  <input
                    type="radio"
                    name="mood"
                    value={mood.value}
                    required
                    defaultChecked={index === 0}
                  />
                  {mood.label}
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <label>还想再来一次吗？</label>
            <div className="choice-row">
              {WANT_AGAIN.map((item) => (
                <label key={item.value} className="choice">
                  <input type="radio" name="wantAgain" value={item.value} />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          <details className="more-options">
            <summary>更多选项</summary>
            <div className="stack" style={{ marginTop: "0.85rem" }}>
              <div className="field">
                <label>标签（可选）</label>
                <div className="choice-row">
                  {TAGS.map((tag) => (
                    <label key={tag} className="choice">
                      <input type="checkbox" name="tags" value={tag} />
                      {tag}
                    </label>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>可见性</label>
                <div className="choice-row">
                  <label className="choice">
                    <input type="radio" name="visibility" value="shared" defaultChecked />
                    双方可见
                  </label>
                  <label className="choice">
                    <input type="radio" name="visibility" value="private" />
                    仅自己
                  </label>
                </div>
              </div>

              <div className="field">
                <label htmlFor="happenedAt">发生时间（可补记）</label>
                <input id="happenedAt" name="happenedAt" type="datetime-local" />
              </div>
            </div>
          </details>
        </ActionForm>
      </div>

      <AppNav current="/home" openPlanCount={openPlanCount} />
    </main>
  );
}
