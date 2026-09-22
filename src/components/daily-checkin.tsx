"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function storageKey() {
  const d = new Date();
  return `jianai-checkin-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function DailyCheckin({ visible }: { visible: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!visible) return;
    try {
      if (window.localStorage.getItem(storageKey()) === "1") return;
      setShow(true);
    } catch {
      setShow(true);
    }
  }, [visible]);

  if (!visible || !show) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(storageKey(), "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  return (
    <section className="quality-card checkin-nudge" role="status">
      <p className="quality-kicker">今日轻问</p>
      <h2 className="quality-title">今天还没记相处</h2>
      <p className="quality-body">
        不用写很长。一句话、一个心情，就够让对方知道你在。
      </p>
      <div className="inline-actions">
        <Link className="btn btn-accent" href="/moments/new" onClick={dismiss}>
          记一条
        </Link>
        <button className="btn btn-ghost" type="button" onClick={dismiss}>
          今天先这样
        </button>
      </div>
    </section>
  );
}
