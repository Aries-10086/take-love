"use client";

import { useMemo, useState } from "react";

type QuizMoment = {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
};

type Props = {
  moments: QuizMoment[];
  meId: string;
  meName: string;
  partnerId?: string | null;
  partnerName?: string | null;
};

export function GuessAuthor({
  moments,
  meId,
  meName,
  partnerId,
  partnerName,
}: Props) {
  const pool = useMemo(() => {
    if (!partnerId) return [] as QuizMoment[];
    return moments.filter((m) => m.content.trim().length >= 8).slice(0, 40);
  }, [moments, partnerId]);

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<"hit" | "miss" | null>(null);
  const [done, setDone] = useState(false);

  if (!partnerId || !partnerName) {
    return (
      <div className="magic-card">
        <div className="magic-card-head">
          <h2>猜作者</h2>
          <p>等另一半加入后，就能玩「这句话是谁写的」。</p>
        </div>
        <p className="magic-empty">先邀请另一半进空间。</p>
      </div>
    );
  }

  if (pool.length < 2) {
    return (
      <div className="magic-card">
        <div className="magic-card-head">
          <h2>猜作者</h2>
          <p>从共享时刻里抽一句，猜是谁写的。</p>
        </div>
        <p className="magic-empty">至少再记几条共享时刻，题库才够趣味。</p>
      </div>
    );
  }

  const current = pool[index % pool.length]!;

  function guess(authorId: string) {
    if (answered || done) return;
    const hit = authorId === current.authorId;
    setAnswered(hit ? "hit" : "miss");
    if (hit) setScore((s) => s + 1);
  }

  function next() {
    const nextIndex = index + 1;
    if (nextIndex >= Math.min(5, pool.length)) {
      setDone(true);
      return;
    }
    setIndex(nextIndex);
    setAnswered(null);
  }

  function restart() {
    setIndex(0);
    setScore(0);
    setAnswered(null);
    setDone(false);
  }

  return (
    <div className="magic-card">
      <div className="magic-card-head">
        <h2>猜作者</h2>
        <p>这句话是谁写的？五题一轮，测默契也测记忆。</p>
      </div>

      {done ? (
        <div className="stack">
          <p className="play-result">
            本轮 {score} / {Math.min(5, pool.length)} 题猜对
          </p>
          <button type="button" className="btn btn-primary" onClick={restart}>
            再来一轮
          </button>
        </div>
      ) : (
        <div className="stack">
          <p className="guess-quote">「{current.content}」</p>
          <div className="inline-actions">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={Boolean(answered)}
              onClick={() => guess(meId)}
            >
              {meName}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={Boolean(answered)}
              onClick={() => guess(partnerId)}
            >
              {partnerName}
            </button>
          </div>
          {answered ? (
            <p className={answered === "hit" ? "form-success" : "form-error"}>
              {answered === "hit"
                ? `答对了，是 ${current.authorName}`
                : `差点！其实是 ${current.authorName}`}
            </p>
          ) : null}
          {answered ? (
            <button type="button" className="btn btn-accent" onClick={next}>
              {index + 1 >= Math.min(5, pool.length) ? "看得分" : "下一题"}
            </button>
          ) : (
            <p className="sync-meta">
              第 {index + 1} / {Math.min(5, pool.length)} 题
            </p>
          )}
        </div>
      )}
    </div>
  );
}
