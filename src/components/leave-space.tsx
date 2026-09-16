"use client";

import { useTransition } from "react";
import { leaveSpaceAction } from "@/lib/actions";

export function LeaveSpaceButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      className="btn btn-ghost btn-block"
      type="button"
      disabled={pending}
      onClick={() => {
        const ok = window.confirm("退出后将无法再看这个空间的共享内容，确定吗？");
        if (!ok) return;
        startTransition(() => leaveSpaceAction());
      }}
    >
      {pending ? "退出中…" : "退出当前空间"}
    </button>
  );
}
