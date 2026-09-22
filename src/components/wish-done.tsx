"use client";

import { useTransition } from "react";
import { toggleWishDoneAction } from "@/lib/actions";

export function WishDoneButton({
  wishId,
  isDone,
}: {
  wishId: string;
  isDone: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-ghost"
      disabled={pending}
      onClick={() => start(() => toggleWishDoneAction(wishId))}
    >
      {pending ? "…" : isDone ? "标回未完成" : "完成这个愿望"}
    </button>
  );
}
