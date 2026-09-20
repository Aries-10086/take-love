import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { moodLabel, wantAgainLabel } from "@/lib/constants";
import { parseTags } from "@/lib/suggestions";

type MomentCardProps = {
  id: string;
  content: string;
  mood: string;
  tags: string;
  visibility: string;
  happenedAt: Date;
  authorName: string;
  wantAgain?: string | null;
  pinned?: boolean;
};

export function MomentCard({
  id,
  content,
  mood,
  tags,
  visibility,
  happenedAt,
  authorName,
  wantAgain,
  pinned,
}: MomentCardProps) {
  const tagList = parseTags(tags);
  const again = wantAgainLabel(wantAgain);
  const moodClass = ["happy", "calm", "tired", "moved", "surprise"].includes(mood)
    ? `mood-${mood}`
    : "";

  return (
    <article className={`moment-item ${moodClass}`}>
      <Link href={`/moments/${id}`} className="moment-link">
        <header className="moment-meta">
          <time dateTime={happenedAt.toISOString()}>
            {format(happenedAt, "M月d日 EEEE · HH:mm", { locale: zhCN })}
          </time>
          <span className="moment-author">
            {pinned ? "置顶 · " : ""}
            {authorName}
          </span>
        </header>
        <p className="moment-content">{content}</p>
        <footer className="moment-footer">
          <span className="chip mood">{moodLabel(mood)}</span>
          {again ? <span className="chip soft">{again}</span> : null}
          {visibility === "private" ? <span className="chip muted">仅自己</span> : null}
          {tagList.map((tag) => (
            <span key={tag} className="chip soft">
              {tag}
            </span>
          ))}
        </footer>
      </Link>
    </article>
  );
}
