"use client";

import { useTransition } from "react";
import { togglePinMomentAction } from "@/lib/actions";

export function PinMomentButton({
  momentId,
  pinned,
}: {
  momentId: string;
  pinned: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      className="btn btn-ghost"
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => togglePinMomentAction(momentId))}
    >
      {pending ? "处理中…" : pinned ? "取消置顶" : "置顶"}
    </button>
  );
}
