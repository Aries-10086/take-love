import Link from "next/link";

export const metadata = {
  title: "隐私说明 · 捡爱",
  description: "捡爱如何处理你们的双人空间数据。",
};

export default function PrivacyPage() {
  return (
    <main className="shell legal-page">
      <p className="brand-mark">
        捡爱 <span>隐私</span>
      </p>
      <h1>隐私说明</h1>
      <p className="lede">简短说明我们如何对待你们的数据。不做广场，不做公开推荐。</p>

      <section className="panel stack legal-body">
        <div>
          <h2>我们收集什么</h2>
          <p>
            账号邮箱、昵称与密码哈希；你们在恋爱空间中写下的时刻、建议反馈、约会与玩法内容。
          </p>
        </div>
        <div>
          <h2>谁能看到</h2>
          <p>
            默认仅空间内最多两名成员可见。标记为「仅自己」的时刻，另一半看不到。没有公开动态流。
          </p>
        </div>
        <div>
          <h2>如何退出</h2>
          <p>
            可随时退出空间；退出后邀请码会更换，避免旧码被滥用。也可在设置中注销账号——登录凭证作废，共享记录留给仍在空间的另一半。
          </p>
        </div>
        <div>
          <h2>安全说明</h2>
          <p>
            密码经哈希存储；服务端操作需登录。当前为情侣小范围产品，部署方需自行保管
            AUTH_SECRET 与数据库。
          </p>
        </div>
      </section>

      <div className="inline-actions" style={{ marginTop: "1.25rem" }}>
        <Link className="btn btn-ghost" href="/">
          返回
        </Link>
        <Link className="btn btn-accent" href="/register">
          开始使用
        </Link>
      </div>
    </main>
  );
}
