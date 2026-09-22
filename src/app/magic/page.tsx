import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { AppNav } from "@/components/app-nav";
import { GuessAuthor } from "@/components/guess-author";
import { DareSpinner, TonightDecide, TruthDeck, FortuneStick, WouldYouRather, HotSeat, WhoPays, RockPaperScissors, TalkTimer, MadLibsLetter, CoupleBingo } from "@/components/magic-play";
import { MemoryLottery } from "@/components/memory-lottery";
import { RevealSurpriseButton } from "@/components/reveal-surprise";
import { WishDoneButton } from "@/components/wish-done";
import {
  answerSyncQuestionAction,
  createComplimentAction,
  createSurpriseNoteAction,
  createSyncQuestionAction,
  createWishAction,
  submitDailyMoodAction,
} from "@/lib/actions";
import { auth } from "@/lib/auth";
import { MOODS, moodLabel } from "@/lib/constants";
import {
  answersMatch,
  buildLoveReport,
  computeMoodStreak,
  dayKeysBack,
  SYNC_PROMPTS,
  todayKey,
} from "@/lib/magic";
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

  const me = membership.space.members.find((m) => m.userId === session.user.id);
  const partner = membership.space.members.find((m) => m.userId !== session.user.id);
  const day = todayKey();
  const streakDays = dayKeysBack(14);

  const [moments, plans, questions, surprises, wishes, moodsToday, moodsStreak, compliments] =
    await Promise.all([
    prisma.moment.findMany({
      where: {
        spaceId: membership.spaceId,
        OR: [{ visibility: "shared" }, { authorId: session.user.id }],
      },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { happenedAt: "desc" },
      take: 150,
    }),
    prisma.plan.findMany({
      where: { spaceId: membership.spaceId },
      select: { title: true, status: true, completedAt: true },
      take: 80,
    }),
    prisma.syncQuestion.findMany({
      where: { spaceId: membership.spaceId },
      include: {
        answers: { include: { user: { select: { id: true, name: true } } } },
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.surpriseNote.findMany({
      where: { spaceId: membership.spaceId },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.wishItem.findMany({
      where: { spaceId: membership.spaceId },
      include: { author: { select: { name: true } } },
      orderBy: [{ isDone: "asc" }, { createdAt: "desc" }],
      take: 20,
    }),
    prisma.dailyMood.findMany({
      where: { spaceId: membership.spaceId, day },
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.dailyMood.findMany({
      where: { spaceId: membership.spaceId, day: { in: streakDays } },
      select: { userId: true, day: true },
    }),
    prisma.compliment.findMany({
      where: { spaceId: membership.spaceId },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const moods = moodsToday;
  const memberIds = membership.space.members.map((m) => m.userId);
  const moodStreak = computeMoodStreak(streakDays, moodsStreak, memberIds);

  const openPlanCount = plans.filter((p) => p.status === "proposed").length;
  const sharedMoments = moments.filter((m) => m.visibility === "shared");

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
  const dayNum = today.getDate();
  const onThisDay = sharedMoments.filter((m) => {
    const d = m.happenedAt;
    const isSameDay = d.getMonth() === month && d.getDate() === dayNum;
    const startOfToday = new Date(today.getFullYear(), month, dayNum).getTime();
    return isSameDay && d.getTime() < startOfToday;
  });

  const echoes = sharedMoments
    .filter((m) => {
      const diff = Math.round(
        (today.getTime() - m.happenedAt.getTime()) / 86400000,
      );
      return [7, 14, 30, 100, 365].includes(diff);
    })
    .slice(0, 5);

  const lotteryMoments = sharedMoments.map((m) => ({
    id: m.id,
    content: m.content,
    authorName: m.author.name,
    happenedAt: format(m.happenedAt, "yyyy年M月d日", { locale: zhCN }),
    moodLabel: moodLabel(m.mood),
  }));

  const suggestedPrompt =
    SYNC_PROMPTS[Math.floor(Date.now() / 86400000) % SYNC_PROMPTS.length];

  const myMood = moods.find((m) => m.userId === session.user.id);
  const partnerMood = partner
    ? moods.find((m) => m.userId === partner.userId)
    : null;
  const bothMoods = Boolean(myMood && partnerMood);
  const moodMatched = bothMoods && myMood!.mood === partnerMood!.mood;

  return (
    <main className="shell">
      <div className="page-head">
        <div>
          <p className="brand-mark">
            捡爱 <span>玩法</span>
          </p>
          <h1>玩法集市</h1>
          <p className="lede">
            转盘、签文、Bingo、猜作者、夸夸墙、愿望罐……今晚不够玩再刷一轮。
          </p>
        </div>
      </div>

      <div className="magic-grid">
        <section className="magic-card streak-card">
          <div className="magic-card-head">
            <h2>双人心情连击</h2>
            <p>双方都提交「今日心情」才算一天。连击靠默契续上。</p>
          </div>
          <p className="streak-num">
            <strong>{moodStreak}</strong>
            <span>天</span>
          </p>
          <p className="sync-meta">
            {moodStreak === 0
              ? "还没连上。去下面交今日心情，拉对方一起。"
              : `已连续 ${moodStreak} 天对上暗号。别断。`}
          </p>
        </section>

        <MemoryLottery moments={lotteryMoments} />
        <TonightDecide />
        <DareSpinner />
        <TruthDeck />
        <FortuneStick />
        <WouldYouRather />
        <HotSeat />
        <WhoPays
          meName={me?.user.name ?? session.user.name ?? "我"}
          partnerName={partner?.user.name}
        />
        <RockPaperScissors
          meName={me?.user.name ?? session.user.name ?? "我"}
          partnerName={partner?.user.name}
        />
        <TalkTimer />
        <MadLibsLetter />
        <CoupleBingo />

        <GuessAuthor
          meId={session.user.id}
          meName={me?.user.name ?? session.user.name ?? "我"}
          partnerId={partner?.userId}
          partnerName={partner?.user.name}
          moments={sharedMoments.map((m) => ({
            id: m.id,
            content: m.content,
            authorId: m.authorId,
            authorName: m.author.name,
          }))}
        />

        <section className="magic-card">
          <div className="magic-card-head">
            <h2>今日心情同步</h2>
            <p>各自选一个心情，都交完才一起揭晓——像对暗号。</p>
          </div>
          <ActionForm
            action={submitDailyMoodAction}
            submitLabel={myMood ? "更新我的心情" : "提交今日心情"}
            submitClassName="btn btn-primary"
          >
            <fieldset className="choice-fieldset">
              <legend>我的心情</legend>
              <div className="choice-row">
                {MOODS.map((mood) => (
                  <label key={mood.value} className="choice">
                    <input
                      type="radio"
                      name="mood"
                      value={mood.value}
                      required
                      defaultChecked={(myMood?.mood ?? "happy") === mood.value}
                    />
                    {mood.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="field">
              <label htmlFor="mood-note">一句话（可选）</label>
              <input
                id="mood-note"
                name="note"
                maxLength={80}
                defaultValue={myMood?.note ?? ""}
                placeholder="比如：有点想散步"
              />
            </div>
          </ActionForm>
          <div className="stack" style={{ marginTop: "0.85rem" }}>
            {!partner ? (
              <p className="magic-empty">等另一半加入后，才能对暗号。</p>
            ) : bothMoods ? (
              <ul className="sync-answers">
                <li>
                  <strong>{myMood!.user.name}</strong>：{moodLabel(myMood!.mood)}
                  {myMood!.note ? ` · ${myMood!.note}` : ""}
                </li>
                <li>
                  <strong>{partnerMood!.user.name}</strong>：
                  {moodLabel(partnerMood!.mood)}
                  {partnerMood!.note ? ` · ${partnerMood!.note}` : ""}
                </li>
                <li className={moodMatched ? "form-success" : "sync-meta"}>
                  {moodMatched ? "今日心情同步命中" : "心情不同也很好，正好聊聊"}
                </li>
              </ul>
            ) : myMood ? (
              <p className="form-success">你已提交，等待 {partner.user.name}…</p>
            ) : (
              <p className="magic-empty">先交你的心情，对方交完才揭晓。</p>
            )}
          </div>
        </section>

        <section className="magic-card">
          <div className="magic-card-head">
            <h2>夸夸墙</h2>
            <p>公开贴一句夸奖。不是私密便签，是亮出来的喜欢。</p>
          </div>
          <ActionForm
            action={createComplimentAction}
            submitLabel="贴上去"
            submitClassName="btn btn-accent"
          >
            <div className="field">
              <label htmlFor="compliment">夸奖</label>
              <input
                id="compliment"
                name="content"
                required
                maxLength={120}
                placeholder="比如：你今天说话的样子特别温柔"
              />
            </div>
          </ActionForm>
          <div className="stack" style={{ marginTop: "1rem" }}>
            {compliments.length === 0 ? (
              <p className="magic-empty">墙还是空的。先夸一句。</p>
            ) : (
              compliments.map((c) => (
                <article key={c.id} className="wish-item">
                  <p className="wish-content">{c.content}</p>
                  <p className="sync-meta">
                    {c.author.name} · {format(c.createdAt, "M月d日 HH:mm", { locale: zhCN })}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="magic-card">
          <div className="magic-card-head">
            <h2>愿望罐</h2>
            <p>把想一起做的事丢进去。完成后打勾，慢慢清空罐子。</p>
          </div>
          <ActionForm
            action={createWishAction}
            submitLabel="投进罐子"
            submitClassName="btn btn-accent"
          >
            <div className="field">
              <label htmlFor="wish">愿望</label>
              <input
                id="wish"
                name="content"
                required
                maxLength={120}
                placeholder="比如：一起去看一场日出"
              />
            </div>
          </ActionForm>
          <div className="stack" style={{ marginTop: "1rem" }}>
            {wishes.length === 0 ? (
              <p className="magic-empty">罐子还是空的。丢一个进去吧。</p>
            ) : (
              wishes.map((wish) => (
                <article key={wish.id} className={`wish-item${wish.isDone ? " done" : ""}`}>
                  <p className="wish-content">
                    {wish.isDone ? "✓ " : ""}
                    {wish.content}
                  </p>
                  <p className="sync-meta">
                    {wish.author.name} ·{" "}
                    {format(wish.createdAt, "M月d日", { locale: zhCN })}
                    {wish.isDone && wish.doneAt
                      ? ` · 完成于 ${format(wish.doneAt, "M月d日", { locale: zhCN })}`
                      : ""}
                  </p>
                  <WishDoneButton wishId={wish.id} isDone={wish.isDone} />
                </article>
              ))
            )}
          </div>
        </section>

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
