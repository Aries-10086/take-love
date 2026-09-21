import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { AppNav } from "@/components/app-nav";
import { MemoryLottery } from "@/components/memory-lottery";
import { RevealSurpriseButton } from "@/components/reveal-surprise";
import {
  answerSyncQuestionAction,
  createSurpriseNoteAction,
  createSyncQuestionAction,
} from "@/lib/actions";
import { auth } from "@/lib/auth";
import { moodLabel } from "@/lib/constants";
import { answersMatch, buildLoveReport, SYNC_PROMPTS } from "@/lib/magic";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/space";

function daysBetween(from: Date, to: Date) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

export default async function MagicPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const membership = await getMembership(session.user.id);
  if (!membership) redirect("/onboarding");

  const openPlanCount = await prisma.plan.count({
    where: { spaceId: membership.spaceId, status: "proposed" },
  });

  const me = membership.space.members.find((m) => m.userId === session.user.id);
  const partner = membership.space.members.find((m) => m.userId !== session.user.id);

  const moments = await prisma.moment.findMany({
    where: {
      spaceId: membership.spaceId,
      OR: [{ visibility: "shared" }, { authorId: session.user.id }],
    },
    include: { author: { select: { name: true } } },
    orderBy: { happenedAt: "desc" },
  });

  const sharedMoments = moments.filter((m) => m.visibility === "shared");

  const plans = await prisma.plan.findMany({
    where: { spaceId: membership.spaceId },
    select: { title: true, status: true, completedAt: true },
  });

  const earliest =
    membership.space.anniversaryAt ??
    sharedMoments.slice().sort((a, b) => a.happenedAt.getTime() - b.happenedAt.getTime())[0]
      ?.happenedAt ??
    membership.space.createdAt;

  const report = buildLoveReport({
    spaceName: membership.space.name,
    meName: me?.user.name ?? session.user.name ?? "我",
    partnerName: partner?.user.name,
    daysTogether: daysBetween(earliest, new Date()),
    moments: sharedMoments.map((m) => ({
      content: m.content,
      mood: m.mood,
      tags: m.tags,
      wantAgain: m.wantAgain,
      happenedAt: m.happenedAt,
      authorName: m.author.name,
    })),
    plans,
  });

  const today = new Date();
  const month = today.getMonth();
  const day = today.getDate();
  const onThisDay = sharedMoments.filter((m) => {
    const d = m.happenedAt;
    const isSameDay = d.getMonth() === month && d.getDate() === day;
    const startOfToday = new Date(today.getFullYear(), month, day).getTime();
    return isSameDay && d.getTime() < startOfToday;
  });

  // also "N days ago" echoes: same weekday moments from 7/14/30 days ago window as soft match
  const echoes = sharedMoments
    .filter((m) => {
      const diff = Math.round(
        (today.getTime() - m.happenedAt.getTime()) / 86400000,
      );
      return [7, 14, 30, 100, 365].includes(diff);
    })
    .slice(0, 5);

  const questions = await prisma.syncQuestion.findMany({
    where: { spaceId: membership.spaceId },
    include: {
      answers: { include: { user: { select: { id: true, name: true } } } },
      creator: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const surprises = await prisma.surpriseNote.findMany({
    where: { spaceId: membership.spaceId },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const lotteryMoments = sharedMoments.map((m) => ({
    id: m.id,
    content: m.content,
    authorName: m.author.name,
    happenedAt: format(m.happenedAt, "yyyy年M月d日", { locale: zhCN }),
    moodLabel: moodLabel(m.mood),
  }));

  const suggestedPrompt =
    SYNC_PROMPTS[Math.floor(Date.now() / 86400000) % SYNC_PROMPTS.length];

  return (
    <main className="shell">
      <div className="page-head">
        <div>
          <p className="brand-mark">
            捡爱 <span>玩法</span>
          </p>
          <h1>给感情加点仪式</h1>
          <p className="lede">抽签、报告、那年今日、默契问答、惊喜便签——都只属于你们。</p>
        </div>
      </div>

      <div className="magic-grid">
        <MemoryLottery moments={lotteryMoments} />

        <section className="magic-card">
          <div className="magic-card-head">
            <h2>恋爱报告</h2>
            <p>根据你们的真实记录自动写成一封短笺。</p>
          </div>
          <div className="report-stats">
            <div>
              <strong>{report.stats.daysTogether}</strong>
              <span>天</span>
            </div>
            <div>
              <strong>{report.stats.momentCount}</strong>
              <span>时刻</span>
            </div>
            <div>
              <strong>{report.stats.completedPlans}</strong>
              <span>约会</span>
            </div>
            <div>
              <strong>{report.stats.topTag}</strong>
              <span>最常做</span>
            </div>
          </div>
          <pre className="report-body">{report.body}</pre>
        </section>

        <section className="magic-card">
          <div className="magic-card-head">
            <h2>那年今日</h2>
            <p>
              {format(today, "M月d日", { locale: zhCN })}
              ，从记忆里翻出同一天，或整段时间前的回声。
            </p>
          </div>
          {onThisDay.length === 0 && echoes.length === 0 ? (
            <p className="magic-empty">今天还没有回声。多记几段，之后会越来越有意思。</p>
          ) : (
            <div className="stack">
              {onThisDay.map((m) => (
                <Link key={m.id} href={`/moments/${m.id}`} className="echo-item">
                  <span className="echo-badge">同日</span>
                  <span>
                    {format(m.happenedAt, "yyyy年", { locale: zhCN })} · {m.content.slice(0, 48)}
                    {m.content.length > 48 ? "…" : ""}
                  </span>
                </Link>
              ))}
              {echoes.map((m) => {
                const diff = Math.round(
                  (today.getTime() - m.happenedAt.getTime()) / 86400000,
                );
                return (
                  <Link key={`e-${m.id}`} href={`/moments/${m.id}`} className="echo-item">
                    <span className="echo-badge soft">{diff} 天前</span>
                    <span>
                      {m.content.slice(0, 48)}
                      {m.content.length > 48 ? "…" : ""}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="magic-card">
          <div className="magic-card-head">
            <h2>默契问答</h2>
            <p>双方各自作答，都交卷后才揭晓——像拆盲盒一样测默契。</p>
          </div>

          <ActionForm
            action={createSyncQuestionAction}
            submitLabel="发出这题"
            submitClassName="btn btn-primary"
          >
            <div className="field">
              <label htmlFor="prompt">今日一问</label>
              <input
                id="prompt"
                name="prompt"
                defaultValue={suggestedPrompt}
                maxLength={120}
                required
              />
            </div>
          </ActionForm>

          <div className="stack" style={{ marginTop: "1rem" }}>
            {questions.length === 0 ? (
              <p className="magic-empty">还没有默契题。发一题给 TA 吧。</p>
            ) : (
              questions.map((q) => {
                const myAnswer = q.answers.find((a) => a.userId === session.user.id);
                const bothReady = q.answers.length >= 2;
                const matched =
                  bothReady &&
                  answersMatch(q.answers[0]?.answer ?? "", q.answers[1]?.answer ?? "");

                return (
                  <article key={q.id} className="sync-item">
                    <p className="sync-prompt">{q.prompt}</p>
                    <p className="sync-meta">
                      {q.creator.name} 发起 · {q.answers.length}/2 已答
                      {bothReady ? (matched ? " · 默契命中" : " · 答案不同也很好") : ""}
                    </p>

                    {bothReady ? (
                      <ul className="sync-answers">
                        {q.answers.map((a) => (
                          <li key={a.id}>
                            <strong>{a.user.name}</strong>：{a.answer}
                          </li>
                        ))}
                      </ul>
                    ) : myAnswer ? (
                      <p className="form-success">你已作答，等待另一半…</p>
                    ) : (
                      <ActionForm
                        action={answerSyncQuestionAction}
                        submitLabel="提交答案"
                        submitClassName="btn btn-ghost"
                      >
                        <input type="hidden" name="questionId" value={q.id} />
                        <div className="field">
                          <label htmlFor={`ans-${q.id}`}>你的答案（对方看不到，直到双方都答完）</label>
                          <input id={`ans-${q.id}`} name="answer" required maxLength={80} />
                        </div>
                      </ActionForm>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="magic-card">
          <div className="magic-card-head">
            <h2>惊喜便签</h2>
            <p>写一句藏起来的话。只有对方拆开后才能看见。</p>
          </div>

          <ActionForm
            action={createSurpriseNoteAction}
            submitLabel="藏起来"
            submitClassName="btn btn-accent"
          >
            <div className="field">
              <label htmlFor="content">给 TA 的话</label>
              <textarea
                id="content"
                name="content"
                required
                maxLength={200}
                placeholder="比如：下周想带你去一个地方，先不说是哪里。"
              />
            </div>
          </ActionForm>

          <div className="stack" style={{ marginTop: "1rem" }}>
            {surprises.length === 0 ? (
              <p className="magic-empty">还没有惊喜便签。</p>
            ) : (
              surprises.map((note) => {
                const mine = note.authorId === session.user.id;
                const canReveal = !mine && !note.isRevealed;
                const canRead = mine || note.isRevealed;

                return (
                  <article key={note.id} className="surprise-item">
                    <p className="sync-meta">
                      {mine ? "你留给 TA" : `${note.author.name} 留给你`} ·{" "}
                      {format(note.createdAt, "M月d日 HH:mm", { locale: zhCN })}
                      {note.isRevealed ? " · 已拆开" : " · 未拆开"}
                    </p>
                    {canReveal ? <RevealSurpriseButton noteId={note.id} /> : null}
                    {canRead ? (
                      <p className="surprise-content">{note.content}</p>
                    ) : mine ? (
                      <p className="magic-empty">内容已封存，等 TA 拆开。</p>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>

      <AppNav current="/magic" openPlanCount={openPlanCount} />
    </main>
  );
}
