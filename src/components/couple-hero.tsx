import Link from "next/link";
import { generateSuggestionAction } from "@/lib/actions";

function initialOf(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(0, 1) : "·";
}

function daysBetween(from: Date, to: Date) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
  return Math.max(1, diff + 1);
}

type Props = {
  spaceName: string;
  meName: string;
  partnerName?: string | null;
  since: Date;
  momentCount: number;
  openPlanCount: number;
  weekNote: string;
};

export function CoupleHero({
  spaceName,
  meName,
  partnerName,
  since,
  momentCount,
  openPlanCount,
  weekNote,
}: Props) {
  const days = daysBetween(since, new Date());
  const waiting = !partnerName;

  return (
    <section className="couple-hero">
      <p className="couple-hero-kicker">{spaceName}</p>

      <div className="couple-avatars" aria-hidden="true">
        <span className="couple-avatar me">{initialOf(meName)}</span>
        <span className="couple-link" />
        <span className={`couple-avatar partner${waiting ? " ghost" : ""}`}>
          {waiting ? "?" : initialOf(partnerName)}
        </span>
      </div>

      <h1 className="couple-names">
        {waiting ? meName : `${meName} 与 ${partnerName}`}
      </h1>

      <p className="couple-days">
        <span className="couple-days-num">{days}</span>
        <span className="couple-days-unit">天</span>
      </p>
      <p className="couple-days-caption">
        {waiting ? "专属空间已开启，等另一半加入" : "一起走过的日子"}
      </p>

      <p className="couple-meta">
        {weekNote}
        {momentCount > 0 ? ` · 共 ${momentCount} 段时刻` : ""}
        {openPlanCount > 0 ? ` · ${openPlanCount} 个待办约会` : ""}
      </p>

      <div className="couple-actions">
        <Link className="couple-action primary" href="/moments/new">
          <span className="couple-action-title">记一条</span>
          <span className="couple-action-desc">留下今天的相处</span>
        </Link>
        <form action={generateSuggestionAction} className="couple-action-form">
          <button className="couple-action" type="submit">
            <span className="couple-action-title">要建议</span>
            <span className="couple-action-desc">下次一起做什么</span>
          </button>
        </form>
        <Link className="couple-action" href="/plans">
          <span className="couple-action-title">约会</span>
          <span className="couple-action-desc">
            {openPlanCount > 0 ? `${openPlanCount} 个待完成` : "看看待办"}
          </span>
        </Link>
      </div>
    </section>
  );
}
