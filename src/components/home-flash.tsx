"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusSubmit } from "@/components/status-submit";
import { generateSuggestionAction } from "@/lib/actions";

type Kind = "settled" | "saved" | "joined" | "welcome";

const COPY: Record<Kind, { title: string; body: string }> = {
  settled: {
    title: "约会已写进时光",
    body: "这一趟闭环完成了。要不要再生成下一批约会？",
  },
  saved: {
    title: "记下了",
    body: "要根据这些相处，生成下一次约会建议吗？",
  },
  joined: {
    title: "欢迎加入",
    body: "你们的双人空间已就绪，可以开始记第一条时刻。",
  },
  welcome: {
    title: "空间已创建",
    body: "把邀请码发给另一半，两个人一起写时光。",
  },
};

export function HomeFlash({
  kind,
  momentHref,
}: {
  kind: Kind;
  momentHref?: string;
}) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Clean the query so refresh doesn't re-show the flash forever
    const url = new URL(window.location.href);
    url.searchParams.delete("settled");
    url.searchParams.delete("saved");
    url.searchParams.delete("joined");
    url.searchParams.delete("welcome");
    url.searchParams.delete("moment");
    router.replace(url.pathname + (url.search || ""), { scroll: false });
  }, [router]);

  if (!visible) return null;

  const copy = COPY[kind];

  return (
    <section className="flash-banner" role="status">
      <div>
        <p className="flash-title">{copy.title}</p>
        <p className="flash-body">{copy.body}</p>
      </div>
      <div className="inline-actions">
        {kind === "settled" || kind === "saved" ? (
          <form action={generateSuggestionAction}>
            <StatusSubmit
              label="生成建议"
              pendingLabel="生成中…"
              className="btn btn-accent"
            />
          </form>
        ) : null}
        {kind === "settled" && momentHref ? (
          <Link className="btn btn-ghost" href={momentHref}>
            看看这条
          </Link>
        ) : null}
        {kind === "joined" || kind === "welcome" ? (
          <Link className="btn btn-accent" href="/moments/new">
            记一条
          </Link>
        ) : null}
        <button className="btn btn-ghost" type="button" onClick={() => setVisible(false)}>
          知道了
        </button>
      </div>
    </section>
  );
}
