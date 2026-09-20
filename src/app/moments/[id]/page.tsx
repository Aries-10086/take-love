import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ActionForm } from "@/components/action-form";
import { AppNav } from "@/components/app-nav";
import { DeleteMomentButton } from "@/components/delete-moment";
import { PinMomentButton } from "@/components/pin-moment";
import { updateMomentAction } from "@/lib/actions";
import { auth } from "@/lib/auth";
import { MOODS, TAGS, WANT_AGAIN, moodLabel, wantAgainLabel } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/space";
import { parseTags } from "@/lib/suggestions";

export default async function MomentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const membership = await getMembership(session.user.id);
  if (!membership) redirect("/onboarding");

  const { id } = await params;
  const { edit } = await searchParams;
  const moment = await prisma.moment.findFirst({
    where: {
      id,
      spaceId: membership.spaceId,
      OR: [{ visibility: "shared" }, { authorId: session.user.id }],
    },
    include: { author: { select: { id: true, name: true } } },
  });
  if (!moment) notFound();

  const tags = parseTags(moment.tags);
  const isAuthor = moment.authorId === session.user.id;
  const editing = isAuthor && edit === "1";
  const happenedLocal = format(moment.happenedAt, "yyyy-MM-dd'T'HH:mm");

  const openPlanCount = await prisma.plan.count({
    where: { spaceId: membership.spaceId, status: "proposed" },
  });

  return (
    <main className="shell">
      <div className="page-head">
        <div>
          <p className="brand-mark">
            时刻 <span>{moment.author.name}</span>
          </p>
          <h1>{format(moment.happenedAt, "M月d日", { locale: zhCN })}</h1>
          <p className="lede">
            {format(moment.happenedAt, "EEEE HH:mm", { locale: zhCN })}
          </p>
        </div>
        <Link className="btn btn-ghost" href="/home">
          返回
        </Link>
      </div>

      {editing ? (
        <div className="panel">
          <ActionForm
            action={updateMomentAction}
            submitLabel="保存修改"
            submitClassName="btn btn-accent btn-block"
          >
            <input type="hidden" name="momentId" value={moment.id} />
            <div className="field">
              <label htmlFor="content">内容</label>
              <textarea
                id="content"
                name="content"
                required
                maxLength={200}
                defaultValue={moment.content}
              />
            </div>
            <div className="field">
              <label>心情</label>
              <div className="choice-row">
                {MOODS.map((mood) => (
                  <label key={mood.value} className="choice">
                    <input
                      type="radio"
                      name="mood"
                      value={mood.value}
                      defaultChecked={moment.mood === mood.value}
                      required
                    />
                    {mood.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="field">
              <label>标签</label>
              <div className="choice-row">
                {TAGS.map((tag) => (
                  <label key={tag} className="choice">
                    <input
                      type="checkbox"
                      name="tags"
                      value={tag}
                      defaultChecked={tags.includes(tag)}
                    />
                    {tag}
                  </label>
                ))}
              </div>
            </div>
            <div className="field">
              <label>还想再来一次吗？</label>
              <div className="choice-row">
                {WANT_AGAIN.map((item) => (
                  <label key={item.value} className="choice">
                    <input
                      type="radio"
                      name="wantAgain"
                      value={item.value}
                      defaultChecked={moment.wantAgain === item.value}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="field">
              <label>可见性</label>
              <div className="choice-row">
                <label className="choice">
                  <input
                    type="radio"
                    name="visibility"
                    value="shared"
                    defaultChecked={moment.visibility === "shared"}
                  />
                  双方可见
                </label>
                <label className="choice">
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    defaultChecked={moment.visibility === "private"}
                  />
                  仅自己
                </label>
              </div>
            </div>
            <div className="field">
              <label htmlFor="happenedAt">发生时间</label>
              <input
                id="happenedAt"
                name="happenedAt"
                type="datetime-local"
                defaultValue={happenedLocal}
              />
            </div>
          </ActionForm>
          <div style={{ marginTop: "0.75rem" }}>
            <Link className="btn btn-ghost" href={`/moments/${moment.id}`}>
              取消编辑
            </Link>
          </div>
        </div>
      ) : (
        <article className="panel stack">
          <p className="moment-content">{moment.content}</p>
          <div className="moment-footer">
            <span className="chip">{moodLabel(moment.mood)}</span>
            {wantAgainLabel(moment.wantAgain) ? (
              <span className="chip soft">{wantAgainLabel(moment.wantAgain)}</span>
            ) : null}
            {moment.visibility === "private" ? (
              <span className="chip muted">仅自己</span>
            ) : null}
            {tags.map((tag) => (
              <span key={tag} className="chip soft">
                {tag}
              </span>
            ))}
          </div>

          {isAuthor ? (
            <div className="inline-actions">
              <Link className="btn btn-ghost" href={`/moments/${moment.id}?edit=1`}>
                编辑
              </Link>
              <PinMomentButton momentId={moment.id} pinned={moment.pinned} />
              <DeleteMomentButton momentId={moment.id} />
            </div>
          ) : moment.visibility === "shared" ? (
            <div className="inline-actions">
              <PinMomentButton momentId={moment.id} pinned={moment.pinned} />
            </div>
          ) : null}
        </article>
      )}

      <AppNav current="/home" openPlanCount={openPlanCount} />
    </main>
  );
}
