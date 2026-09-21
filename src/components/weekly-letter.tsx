import Link from "next/link";
import { generateSuggestionAction } from "@/lib/actions";
import { StatusSubmit } from "@/components/status-submit";

type Props = {
  title: string;
  body: string;
  topTag: string;
  topMood: string;
  weekMoments: number;
};

export function WeeklyLetter({
  title,
  body,
  topTag,
  topMood,
  weekMoments,
}: Props) {
  const paragraphs = body.split("\n").filter((line) => line.trim().length > 0);

  return (
    <section className="weekly-letter">
      <p className="quality-kicker">本周来信</p>
      <h2 className="quality-title">{title}</h2>
      <div className="letter-meta">
        <span>{weekMoments} 段本周时刻</span>
        <span>心情偏「{topMood}」</span>
        <span>常做「{topTag}」</span>
      </div>
      <div className="letter-body">
        {paragraphs.map((line, i) => (
          <p key={`${i}-${line.slice(0, 12)}`}>{line}</p>
        ))}
      </div>
      <div className="inline-actions">
        <Link className="btn btn-ghost" href="/moments/new">
          再记一条
        </Link>
        <form action={generateSuggestionAction}>
          <StatusSubmit
            label="生成下次约会"
            pendingLabel="生成中…"
            className="btn btn-accent"
          />
        </form>
      </div>
    </section>
  );
}
