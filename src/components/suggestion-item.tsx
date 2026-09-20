"use client";

import { useState } from "react";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import {
  adoptSuggestionAction,
  feedbackSuggestionAction,
} from "@/lib/actions";
import { DISLIKE_REASONS } from "@/lib/constants";
import type { SuggestionItem } from "@/lib/suggestions";

type Props = {
  suggestionId: string;
  index: number;
  item: SuggestionItem;
  feedbackAction?: string | null;
};

export function SuggestionItemCard({
  suggestionId,
  index,
  item,
  feedbackAction,
}: Props) {
  const [adopting, setAdopting] = useState(false);
  const adopted = feedbackAction === "adopt";

  return (
    <article className="suggestion-card">
      <h2>{item.title}</h2>
      <p>{item.detail}</p>
      <div className="meta-line">
        <span>时长 {item.duration}</span>
        <span>预算 {item.budget}</span>
      </div>
      <p>
        <strong>为什么适合你们：</strong>
        {item.reason}
      </p>
      <div className="moment-footer">
        {item.tags.map((tag) => (
          <span key={tag} className="chip soft">
            {tag}
          </span>
        ))}
        {feedbackAction === "like" ? <span className="chip">已标记喜欢</span> : null}
        {feedbackAction === "dislike" ? (
          <span className="chip muted">已反馈不合适</span>
        ) : null}
        {adopted ? <span className="chip soft">已采纳</span> : null}
      </div>

      {adopted ? (
        <div className="inline-actions">
          <Link className="btn btn-accent" href="/plans">
            去约会页
          </Link>
        </div>
      ) : !adopting ? (
        <div className="inline-actions">
          <button className="btn btn-accent" type="button" onClick={() => setAdopting(true)}>
            就这个
          </button>
          {feedbackAction !== "like" ? (
            <ActionForm
              action={feedbackSuggestionAction}
              submitLabel="喜欢"
              submitClassName="btn btn-ghost"
            >
              <input type="hidden" name="suggestionId" value={suggestionId} />
              <input type="hidden" name="itemIndex" value={index} />
              <input type="hidden" name="action" value="like" />
            </ActionForm>
          ) : null}
        </div>
      ) : (
        <ActionForm
          action={adoptSuggestionAction}
          submitLabel="确认加入约会"
          submitClassName="btn btn-accent"
        >
          <input type="hidden" name="suggestionId" value={suggestionId} />
          <input type="hidden" name="itemIndex" value={index} />
          <input type="hidden" name="duration" value={item.duration} />
          <input type="hidden" name="budget" value={item.budget} />
          <div className="field">
            <label htmlFor={`title-${index}`}>标题（可改）</label>
            <input id={`title-${index}`} name="title" defaultValue={item.title} required />
          </div>
          <div className="field">
            <label htmlFor={`detail-${index}`}>怎么做（可改）</label>
            <textarea id={`detail-${index}`} name="detail" defaultValue={item.detail} required />
          </div>
          <div className="field">
            <label htmlFor={`scheduled-${index}`}>打算什么时候？（可选）</label>
            <input id={`scheduled-${index}`} name="scheduledAt" type="datetime-local" />
          </div>
          <button className="btn btn-ghost" type="button" onClick={() => setAdopting(false)}>
            先不采纳
          </button>
        </ActionForm>
      )}

      {!adopted && feedbackAction !== "dislike" ? (
        <details style={{ marginTop: "0.75rem" }}>
          <summary style={{ cursor: "pointer", color: "var(--ink-soft)" }}>
            不合适？告诉原因
          </summary>
          <ActionForm
            action={feedbackSuggestionAction}
            submitLabel="提交反馈"
            submitClassName="btn btn-ghost"
          >
            <input type="hidden" name="suggestionId" value={suggestionId} />
            <input type="hidden" name="itemIndex" value={index} />
            <input type="hidden" name="action" value="dislike" />
            <div className="choice-row" style={{ marginTop: "0.6rem" }}>
              {DISLIKE_REASONS.map((reason) => (
                <label key={reason.value} className="choice">
                  <input type="checkbox" name="reasons" value={reason.value} />
                  {reason.label}
                </label>
              ))}
            </div>
          </ActionForm>
        </details>
      ) : null}
    </article>
  );
}
