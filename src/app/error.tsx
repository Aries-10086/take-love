"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="auth-shell">
      <p className="brand-mark">
        捡爱 <span>出错了</span>
      </p>
      <h1>刚才有点走神</h1>
      <p className="lede">页面加载失败了。可以重试，或回到首页继续你们的时光。</p>
      <div className="inline-actions" style={{ marginTop: "1.25rem" }}>
        <button className="btn btn-accent" type="button" onClick={reset}>
          再试一次
        </button>
        <a className="btn btn-ghost" href="/home">
          回首页
        </a>
      </div>
    </main>
  );
}
