import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { loginAction } from "@/lib/actions";
import { auth } from "@/lib/auth";
import { getMembership } from "@/lib/space";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) {
    const membership = await getMembership(session.user.id);
    redirect(membership ? "/home" : "/onboarding");
  }

  return (
    <main className="shell">
      <div className="page-head">
        <div>
          <p className="brand-mark">
            捡爱 <span>登录</span>
          </p>
          <h1>欢迎回来</h1>
          <p className="lede">用邮箱进入你们的恋爱空间。</p>
        </div>
      </div>

      <div className="panel">
        <ActionForm
          action={loginAction}
          submitLabel="登录"
          submitClassName="btn btn-primary btn-block"
        >
          <div className="field">
            <label htmlFor="email">邮箱</label>
            <input id="email" name="email" type="email" required placeholder="you@example.com" />
          </div>
          <div className="field">
            <label htmlFor="password">密码</label>
            <input id="password" name="password" type="password" required minLength={6} />
          </div>
        </ActionForm>
      </div>

      <p className="week-note" style={{ marginTop: "1rem" }}>
        还没有账号？ <Link href="/register">注册</Link>
      </p>
    </main>
  );
}
