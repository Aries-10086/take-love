import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { loginAction } from "@/lib/actions";
import { auth } from "@/lib/auth";
import { getMembership } from "@/lib/space";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await auth();
  const { next: nextParam } = await searchParams;
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/enter";

  const inviteFromNext = (() => {
    try {
      const url = new URL(next, "https://jianai.local");
      if (!url.pathname.startsWith("/onboarding")) return "";
      return (url.searchParams.get("code") ?? "").trim().toUpperCase().slice(0, 6);
    } catch {
      return "";
    }
  })();

  if (session?.user?.id) {
    const membership = await getMembership(session.user.id);
    redirect(membership ? "/home" : next.includes("onboarding") ? next : "/onboarding");
  }

  return (
    <main className="auth-shell">
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
          <input type="hidden" name="next" value={next} />
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
            />
          </div>
        </ActionForm>
      </div>

      <p className="week-note" style={{ marginTop: "1.15rem" }}>
        还没有账号？{" "}
        <Link href={inviteFromNext ? `/register?code=${encodeURIComponent(inviteFromNext)}` : "/register"}>
          注册
        </Link>
      </p>
    </main>
  );
}
