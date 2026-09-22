"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/actions";
import { PendingSubmit } from "@/components/pending-submit";

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children?: React.ReactNode;
  className?: string;
  submitLabel?: string;
  submitClassName?: string;
  /** Pin submit above bottom nav (thumb zone) */
  stickySubmit?: boolean;
};

export function ActionForm({
  action,
  children,
  className,
  submitLabel,
  submitClassName = "btn btn-primary",
  stickySubmit = false,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  const submit = submitLabel ? (
    <PendingSubmit className={submitClassName} pending={pending} label={submitLabel} />
  ) : null;

  return (
    <form action={formAction} className={className} aria-busy={pending}>
      <fieldset disabled={pending} className="stack" style={{ border: 0, margin: 0, padding: 0, minInlineSize: 0 }}>
        {children}
        {stickySubmit && submit ? (
          <div className="composer-sticky">{submit}</div>
        ) : (
          submit
        )}
      </fieldset>
      {state.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="form-success" role="status">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
