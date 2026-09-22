"use client";

import { useTransition } from "react";
import { deleteAccountAction, leaveSpaceAction } from "@/lib/actions";

export function LeaveSpaceButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      className="btn btn-ghost btn-block"
      type="button"
      disabled={pending}
      onClick={() => {
        const ok = window.confirm(
          "退出后你将无法再看这个空间的共享内容。若另一半仍在，邀请码会自动更换。确定退出吗？",
        );
        if (!ok) return;
        startTransition(() => leaveSpaceAction());
      }}
    >
      {pending ? "退出中…" : "退出当前空间"}
    </button>
  );
}

export function DeleteAccountButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      className="btn btn-ghost btn-block danger-text"
      type="button"
      disabled={pending}
      onClick={() => {
        const ok = window.confirm(
          "将注销账号并退出空间。共享记录会留给仍在空间的另一半；你的登录会被作废。此操作不可恢复，确定吗？",
        );
        if (!ok) return;
        const again = window.confirm("再次确认：真的要注销账号吗？");
        if (!again) return;
        startTransition(() => deleteAccountAction());
      }}
    >
      {pending ? "注销中…" : "注销账号"}
    </button>
  );
}
