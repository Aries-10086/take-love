import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { registerAction } from "@/lib/actions";
import { auth } from "@/lib/auth";
import { getMembership } from "@/lib/space";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const session = await auth();
  const { code } = await searchParams;
  const inviteCode = (code ?? "").trim().toUpperCase().slice(0, 6);

  if (session?.user?.id) {
    const membership = await getMembership(session.user.id);
    if (membership) redirect("/home");
    redirect(inviteCode ? `/onboarding?code=${encodeURIComponent(inviteCode)}` : "/onboarding");
  }

  return (
    <main className="auth-shell">
      <div className="page-head">
        <div>
          <p className="brand-mark">
            捡爱 <span>注册</span>
          </p>
          <h1>创建账号</h1>
          <p className="lede">
            {inviteCode
              ? "注册后即可用邀请码加入对方的双人空间。"
              : "先留下你的名字，再邀请另一半加入。"}
          </p>
        </div>
      </div>

      <div className="panel">
        <ActionForm
          action={registerAction}
          submitLabel={inviteCode ? "注册并加入" : "注册并进入"}
          submitClassName="btn btn-accent btn-block"
        >
          {inviteCode ? (
            <input type="hidden" name="inviteCode" value={inviteCode} />
          ) : null}
          <div className="field">
            <label htmlFor="name">昵称</label>
            <input id="name" name="name" required maxLength={40} placeholder="怎么称呼你" />
          </div>
          <div className="field">
            <label htmlFor="email">邮箱</label>
            <input id="email" name="email" type="email" required placeholder="you@example.com" />
          </div>
          <div className="field">
            <label htmlFor="password">密码</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={72}
              placeholder="至少 8 位"
            />
          </div>
        </ActionForm>
      </div>

      <p className="trust-note">
        注册即表示你了解：内容仅你与空间内另一半可见，我们不做公开广场。详见{" "}
        <Link href="/privacy">隐私说明</Link>。
      </p>

      <p className="week-note" style={{ marginTop: "0.85rem" }}>
        已有账号？{" "}
        <Link
          href={
            inviteCode
              ? `/login?next=${encodeURIComponent(`/onboarding?code=${inviteCode}`)}`
              : "/login"
          }
        >
          登录
        </Link>
      </p>
    </main>
  );
}
