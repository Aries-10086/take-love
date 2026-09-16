import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { registerAction } from "@/lib/actions";
import { auth } from "@/lib/auth";
import { getMembership } from "@/lib/space";

export default async function RegisterPage() {
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
            捡爱 <span>注册</span>
          </p>
          <h1>创建账号</h1>
          <p className="lede">先留下你的名字，再邀请另一半加入。</p>
        </div>
      </div>

      <div className="panel">
        <ActionForm
          action={registerAction}
          submitLabel="注册并进入"
          submitClassName="btn btn-primary btn-block"
        >
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
            <input id="password" name="password" type="password" required minLength={6} />
          </div>
        </ActionForm>
      </div>

      <p className="week-note" style={{ marginTop: "1rem" }}>
        已有账号？ <Link href="/login">登录</Link>
      </p>
    </main>
  );
}
