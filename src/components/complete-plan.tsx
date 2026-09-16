"use client";

import { useState } from "react";
import { ActionForm } from "@/components/action-form";
import { cancelPlanAction, completePlanAction } from "@/lib/actions";
import { MOODS } from "@/lib/constants";
import { StatusSubmit } from "@/components/status-submit";

type Props = {
  planId: string;
};

export function CompletePlanPanel({ planId }: Props) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="inline-actions">
        <button className="btn btn-accent" type="button" onClick={() => setOpen(true)}>
          完成并沉淀
        </button>
        <form
          action={async () => {
            await cancelPlanAction(planId);
          }}
        >
          <StatusSubmit label="取消这条" className="btn btn-ghost" />
        </form>
      </div>
    );
  }

  return (
    <ActionForm
      action={completePlanAction}
      submitLabel="确认完成并写入时光"
      submitClassName="btn btn-accent"
    >
      <input type="hidden" name="planId" value={planId} />
      <div className="field">
        <label htmlFor={`note-${planId}`}>想补一句感受吗？（可选）</label>
        <textarea
          id={`note-${planId}`}
          name="note"
          placeholder="不填也会自动生成一条记录"
        />
      </div>
      <div className="field">
        <label>完成后的心情</label>
        <div className="choice-row">
          {MOODS.map((mood, index) => (
            <label key={mood.value} className="choice">
              <input
                type="radio"
                name="mood"
                value={mood.value}
                defaultChecked={index === 0}
              />
              {mood.label}
            </label>
          ))}
        </div>
      </div>
      <button className="btn btn-ghost" type="button" onClick={() => setOpen(false)}>
        先不完成
      </button>
    </ActionForm>
  );
}
