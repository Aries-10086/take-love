import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ActionForm } from "@/components/action-form";
import {
  generateSuggestionAction,
  updatePlanScheduleAction,
} from "@/lib/actions";
import { StatusSubmit } from "@/components/status-submit";

type PlanLite = {
  id: string;
  title: string;
  detail: string;
  scheduledAt: Date | null;
};

type Props = {
  plan?: PlanLite | null;
  partnerWaiting?: boolean;
};

export function NextPlanCard({ plan, partnerWaiting }: Props) {
  if (partnerWaiting) return null;

  if (!plan) {
    return (
      <section className="quality-card next-empty">
        <p className="quality-kicker">下一次</p>
        <h2 className="quality-title">还没有约定下次见面</h2>
        <p className="quality-body">
          从一条建议里挑一件小事，订成你们的下一次。不必完美，先动起来。
        </p>
        <div className="inline-actions">
          <form action={generateSuggestionAction}>
            <StatusSubmit
              label="生成下次约会"
              pendingLabel="生成中…"
              className="btn btn-accent"
            />
          </form>
          <Link className="btn btn-ghost" href="/plans">
            自己写一条
          </Link>
        </div>
      </section>
    );
  }

  const overdue =
    plan.scheduledAt != null && plan.scheduledAt.getTime() < Date.now();
  const soon =
    plan.scheduledAt != null &&
    !overdue &&
    plan.scheduledAt.getTime() - Date.now() < 48 * 3600 * 1000;

  const whenLabel = plan.scheduledAt
    ? format(plan.scheduledAt, "M月d日 EEEE HH:mm", { locale: zhCN })
    : "时间还没定";

  const scheduleDefault = plan.scheduledAt
    ? format(plan.scheduledAt, "yyyy-MM-dd'T'HH:mm")
    : "";

  return (
    <section className={`quality-card next-plan${overdue ? " overdue" : ""}`}>
      <p className="quality-kicker">
        {overdue ? "该兑现了" : soon ? "快到了" : "下一次"}
      </p>
      <h2 className="quality-title">{plan.title}</h2>
      <p className="quality-when">{whenLabel}</p>
      <p className="quality-body">{plan.detail}</p>

      <ActionForm
        action={updatePlanScheduleAction}
        submitLabel={plan.scheduledAt ? "改期" : "定个时间"}
        submitClassName="btn btn-ghost"
      >
        <input type="hidden" name="planId" value={plan.id} />
        <div className="field" style={{ marginBottom: "0.5rem" }}>
          <label htmlFor="next-schedule">约会时间</label>
          <input
            id="next-schedule"
            name="scheduledAt"
            type="datetime-local"
            defaultValue={scheduleDefault}
          />
        </div>
      </ActionForm>

      <div className="inline-actions" style={{ marginTop: "0.75rem" }}>
        <Link className="btn btn-accent" href="/plans">
          完成并沉淀
        </Link>
        <Link className="btn btn-ghost" href="/suggestions">
          换一条建议
        </Link>
      </div>
    </section>
  );
}
