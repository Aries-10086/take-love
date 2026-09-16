import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { createSpaceAction, joinSpaceAction } from "@/lib/actions";
import { auth } from "@/lib/auth";
import { getMembership } from "@/lib/space";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await getMembership(session.user.id);
  if (membership) redirect("/home");

  return (
    <main className="shell">
      <div className="page-head">
        <div>
          <p className="brand-mark">
            捡爱 <span>空间</span>
          </p>
          <h1>建立双人空间</h1>
          <p className="lede">一个人创建，另一个人用邀请码加入。最多两人。</p>
        </div>
      </div>

      <div className="stack">
        <section className="panel stack">
          <h2 className="brand" style={{ margin: 0, fontSize: "1.25rem" }}>
            创建我们的空间
          </h2>
          <ActionForm
            action={createSpaceAction}
            submitLabel="创建空间"
            submitClassName="btn btn-primary"
          >
            <div className="field">
              <label htmlFor="name">空间名称</label>
              <input id="name" name="name" placeholder="我们的捡爱" maxLength={40} />
            </div>
          </ActionForm>
        </section>

        <section className="panel stack">
          <h2 className="brand" style={{ margin: 0, fontSize: "1.25rem" }}>
            加入对方的空间
          </h2>
          <ActionForm
            action={joinSpaceAction}
            submitLabel="加入空间"
            submitClassName="btn btn-ghost"
          >
            <div className="field">
              <label htmlFor="inviteCode">邀请码</label>
              <input
                id="inviteCode"
                name="inviteCode"
                placeholder="6 位邀请码"
                maxLength={8}
                style={{ textTransform: "uppercase", letterSpacing: "0.12em" }}
              />
            </div>
          </ActionForm>
        </section>
      </div>
    </main>
  );
}
