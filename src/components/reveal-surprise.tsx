"use client";

import { useState, useTransition } from "react";
import { revealSurpriseNoteAction } from "@/lib/actions";

export function RevealSurpriseButton({ noteId }: { noteId: string }) {
  const [pending, startTransition] = useTransition();
  const [opened, setOpened] = useState(false);

  if (opened) {
    return <p className="form-success">已拆开，刷新后可看到内容。</p>;
  }

  return (
    <button
      className="btn btn-accent surprise-seal"
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await revealSurpriseNoteAction(noteId);
          setOpened(true);
          window.location.reload();
        });
      }}
    >
      {pending ? "拆开中…" : "拆开惊喜便签"}
    </button>
  );
}
