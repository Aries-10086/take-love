"use client";

type Props = {
  pending?: boolean;
  label: string;
  pendingLabel?: string;
  className?: string;
  type?: "submit" | "button";
};

export function PendingSubmit({
  pending = false,
  label,
  pendingLabel = "处理中…",
  className = "btn btn-primary",
  type = "submit",
}: Props) {
  return (
    <button className={className} type={type} disabled={pending} aria-disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}
