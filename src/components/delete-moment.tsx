"use client";

import { useState, useTransition } from "react";
import { deleteMomentAction } from "@/lib/actions";

export function DeleteMomentButton({ momentId }: { momentId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button className="btn btn-ghost" type="button" onClick={() => setConfirming(true)}>
        删除这条记录
      </button>
    );
  }

  return (
    <div className="inline-actions">
      <p className="form-error" style={{ width: "100%", margin: 0 }}>
        删除后无法恢复，确定吗？
      </p>
      <button
        className="btn btn-accent"
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => deleteMomentAction(momentId))}
      >
        {pending ? "删除中…" : "确认删除"}
      </button>
      <button className="btn btn-ghost" type="button" disabled={pending} onClick={() => setConfirming(false)}>
        取消
      </button>
    </div>
  );
}
