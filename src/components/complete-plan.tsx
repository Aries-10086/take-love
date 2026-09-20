"use client";

import { useState, useTransition } from "react";
import { ActionForm } from "@/components/action-form";
import { cancelPlanAction, completePlanAction } from "@/lib/actions";
import { MOODS, WANT_AGAIN } from "@/lib/constants";

type Props = {
  planId: string;
  defaultHappenedAt?: string;
};

export function CompletePlanPanel({ planId, defaultHappenedAt }: Props) {
  const [open, setOpen] = useState(false);
  const [pendingCancel, startCancel] = useTransition();

  if (!open) {
    return (
      <div className="inline-actions">
        <button className="btn btn-accent" type="button" onClick={() => setOpen(true)}>
          完成并沉淀
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          disabled={pendingCancel}
          onClick={() => {
            const ok = window.confirm("确定取消这条约会吗？");
            if (!ok) return;
            startCancel(() => cancelPlanAction(planId));
          }}
        >
          {pendingCancel ? "取消中…" : "取消这条"}
        </button>
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
        <label htmlFor={`happened-${planId}`}>实际发生时间</label>
        <input
          id={`happened-${planId}`}
          name="happenedAt"
          type="datetime-local"
          defaultValue={defaultHappenedAt}
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
      <div className="field">
        <label>还想再来一次吗？</label>
        <div className="choice-row">
          {WANT_AGAIN.map((item) => (
            <label key={item.value} className="choice">
              <input type="radio" name="wantAgain" value={item.value} />
              {item.label}
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
