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
};

export function ActionForm({
  action,
  children,
  className,
  submitLabel,
  submitClassName = "btn btn-primary",
}: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className={className} aria-busy={pending}>
      <fieldset disabled={pending} className="stack" style={{ border: 0, margin: 0, padding: 0, minInlineSize: 0 }}>
        {children}
        {submitLabel ? (
          <PendingSubmit className={submitClassName} pending={pending} label={submitLabel} />
        ) : null}
      </fieldset>
      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}
    </form>
  );
}
