"use client";

import { useFormStatus } from "react-dom";
import { PendingSubmit } from "@/components/pending-submit";

type Props = {
  label: string;
  pendingLabel?: string;
  className?: string;
};

export function StatusSubmit({ label, pendingLabel, className }: Props) {
  const { pending } = useFormStatus();
  return (
    <PendingSubmit
      pending={pending}
      label={label}
      pendingLabel={pendingLabel}
      className={className}
    />
  );
}
