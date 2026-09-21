"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";

type MomentLite = {
  id: string;
  content: string;
  authorName: string;
  happenedAt: string;
  moodLabel: string;
};

export function MemoryLottery({ moments }: { moments: MomentLite[] }) {
  const [drawing, setDrawing] = useState(false);
  const [picked, setPicked] = useState<MomentLite | null>(null);
  const [spinText, setSpinText] = useState("点一下，抽一段回忆");
  const [, startTransition] = useTransition();

  const pool = useMemo(() => moments, [moments]);

  function draw() {
    if (pool.length === 0 || drawing) return;
    setDrawing(true);
    setPicked(null);
    let ticks = 0;
    const timer = window.setInterval(() => {
      const sample = pool[Math.floor(Math.random() * pool.length)];
      setSpinText(sample.content.slice(0, 18) + (sample.content.length > 18 ? "…" : ""));
      ticks += 1;
      if (ticks >= 12) {
        window.clearInterval(timer);
        const final = pool[Math.floor(Math.random() * pool.length)];
        startTransition(() => {
          setPicked(final);
          setDrawing(false);
          setSpinText("抽中了这段");
        });
      }
    }, 80);
  }

  return (
    <div className="magic-card">
      <div className="magic-card-head">
        <h2>记忆抽签</h2>
        <p>从你们写过的时刻里，随机捡回一段。</p>
      </div>
      {pool.length === 0 ? (
        <p className="magic-empty">还没有可抽的回忆，先去记一条吧。</p>
      ) : (
        <>
          <div className={`lottery-stage${drawing ? " spinning" : ""}`}>
            <p className="lottery-spin">{spinText}</p>
          </div>
          <button className="btn btn-accent" type="button" onClick={draw} disabled={drawing}>
            {drawing ? "抽取中…" : picked ? "再抽一次" : "开始抽签"}
          </button>
          {picked ? (
            <article className="lottery-result">
              <p className="lottery-meta">
                {picked.authorName} · {picked.happenedAt} · {picked.moodLabel}
              </p>
              <p className="lottery-content">{picked.content}</p>
              <Link className="btn btn-ghost" href={`/moments/${picked.id}`}>
                打开这条时刻
              </Link>
            </article>
          ) : null}
        </>
      )}
    </div>
  );
}
