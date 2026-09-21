import Link from "next/link";
import { createAnniversaryPlanAction } from "@/lib/actions";
import { StatusSubmit } from "@/components/status-submit";

export function AnniversaryBanner({ daysLeft }: { daysLeft: number }) {
  const when =
    daysLeft === 0 ? "就是今天" : daysLeft === 1 ? "明天" : `${daysLeft} 天后`;

  return (
    <section className="quality-card anniversary">
      <p className="quality-kicker">纪念日临近</p>
      <h2 className="quality-title">你们的日子 {when} 到了</h2>
      <p className="quality-body">
        不必大张旗鼓。一封短信道、一顿认真的饭，就够把心意说清楚。
      </p>
      <div className="inline-actions">
        <form action={createAnniversaryPlanAction}>
          <StatusSubmit
            label="安排一个小仪式"
            pendingLabel="加入中…"
            className="btn btn-accent"
          />
        </form>
        <Link className="btn btn-ghost" href="/settings">
          改纪念日
        </Link>
      </div>
    </section>
  );
}
