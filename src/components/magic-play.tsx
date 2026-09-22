"use client";

import { useEffect, useState, useTransition } from "react";
import {
  DARE_SPINS,
  FORTUNE_STICKS,
  HOT_SEAT,
  MADLIB_TEMPLATES,
  TONIGHT_OPTIONS,
  TRUTH_CARDS,
  WOULD_YOU_RATHER,
} from "@/lib/magic";

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)]!;
}

export function TonightDecide() {
  const [result, setResult] = useState<string | null>(null);
  const [spinning, start] = useTransition();

  return (
    <div className="magic-card">
      <div className="magic-card-head">
        <h2>今晚谁定</h2>
        <p>甩一下命运硬币，把决定权交给仪式感。</p>
      </div>
      <button
        type="button"
        className="btn btn-accent"
        disabled={spinning}
        onClick={() => {
          start(async () => {
            setResult(null);
            await new Promise((r) => setTimeout(r, 420));
            setResult(pick(TONIGHT_OPTIONS));
          });
        }}
      >
        {spinning ? "甩硬币中…" : "甩一下"}
      </button>
      {result ? <p className="play-result">{result}</p> : null}
    </div>
  );
}

export function DareSpinner() {
  const [dare, setDare] = useState<string | null>(null);
  const [spinning, start] = useTransition();

  return (
    <div className="magic-card">
      <div className="magic-card-head">
        <h2>心动转盘</h2>
        <p>转出一件今晚就能做的小挑战。</p>
      </div>
      <button
        type="button"
        className="btn btn-primary"
        disabled={spinning}
        onClick={() => {
          start(async () => {
            setDare(null);
            await new Promise((r) => setTimeout(r, 520));
            setDare(pick(DARE_SPINS));
          });
        }}
      >
        {spinning ? "转动中…" : "转一下"}
      </button>
      {dare ? <p className="play-result accent">{dare}</p> : null}
    </div>
  );
}

export function TruthDeck() {
  const [card, setCard] = useState<string | null>(null);
  const [used, setUsed] = useState<string[]>([]);

  function draw() {
    const pool = TRUTH_CARDS.filter((c) => !used.includes(c));
    const next = pick(pool.length > 0 ? pool : TRUTH_CARDS);
    setCard(next);
    setUsed((prev) => {
      const nextUsed = pool.length > 0 ? [...prev, next] : [next];
      return nextUsed.length >= TRUTH_CARDS.length ? [] : nextUsed;
    });
  }

  return (
    <div className="magic-card">
      <div className="magic-card-head">
        <h2>真心话牌</h2>
        <p>抽一张，轮流认真答。不许敷衍。</p>
      </div>
      <button type="button" className="btn btn-ghost" onClick={draw}>
        {card ? "再抽一张" : "抽一张"}
      </button>
      {card ? <p className="play-result truth">{card}</p> : null}
    </div>
  );
}

export function FortuneStick() {
  const [text, setText] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="magic-card">
      <div className="magic-card-head">
        <h2>恋爱签</h2>
        <p>抽一支今日签文，当仪式，不当迷信。</p>
      </div>
      <button
        type="button"
        className="btn btn-accent"
        disabled={pending}
        onClick={() => {
          start(async () => {
            setText(null);
            await new Promise((r) => setTimeout(r, 380));
            setText(pick(FORTUNE_STICKS));
          });
        }}
      >
        {pending ? "抽签中…" : "抽一支"}
      </button>
      {text ? <p className="play-result">{text}</p> : null}
    </div>
  );
}

export function WouldYouRather() {
  const [item, setItem] = useState(() => pick(WOULD_YOU_RATHER));
  const [choice, setChoice] = useState<"a" | "b" | null>(null);

  return (
    <div className="magic-card">
      <div className="magic-card-head">
        <h2>你更想</h2>
        <p>二选一，说完再听对方怎么选。</p>
      </div>
      <div className="inline-actions">
        <button
          type="button"
          className={`btn ${choice === "a" ? "btn-accent" : "btn-ghost"}`}
          onClick={() => setChoice("a")}
        >
          {item.a}
        </button>
        <button
          type="button"
          className={`btn ${choice === "b" ? "btn-accent" : "btn-ghost"}`}
          onClick={() => setChoice("b")}
        >
          {item.b}
        </button>
      </div>
      {choice ? (
        <p className="sync-meta" style={{ marginTop: "0.75rem" }}>
          你选了「{choice === "a" ? item.a : item.b}」。把手机给 TA 看，再聊为什么。
        </p>
      ) : null}
      <button
        type="button"
        className="btn btn-ghost"
        style={{ marginTop: "0.65rem" }}
        onClick={() => {
          setChoice(null);
          setItem(pick(WOULD_YOU_RATHER));
        }}
      >
        换一题
      </button>
    </div>
  );
}

export function HotSeat() {
  const [q, setQ] = useState<string | null>(null);

  return (
    <div className="magic-card">
      <div className="magic-card-head">
        <h2>热座位</h2>
        <p>被点到的人，必须认真回答这一题。</p>
      </div>
      <button type="button" className="btn btn-primary" onClick={() => setQ(pick(HOT_SEAT))}>
        {q ? "换题" : "点名提问"}
      </button>
      {q ? <p className="play-result accent">{q}</p> : null}
    </div>
  );
}

export function WhoPays({
  meName,
  partnerName,
}: {
  meName: string;
  partnerName?: string | null;
}) {
  const [winner, setWinner] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const names = partnerName ? [meName, partnerName] : [meName, "命运"];

  return (
    <div className="magic-card">
      <div className="magic-card-head">
        <h2>谁请客</h2>
        <p>摇一摇，决定今晚谁买单（也可当谁洗碗）。</p>
      </div>
      <button
        type="button"
        className="btn btn-accent"
        disabled={pending}
        onClick={() => {
          start(async () => {
            setWinner(null);
            await new Promise((r) => setTimeout(r, 450));
            setWinner(pick(names));
          });
        }}
      >
        {pending ? "摇晃中…" : "摇出人选"}
      </button>
      {winner ? <p className="play-result">今晚请：{winner}</p> : null}
    </div>
  );
}

type Rps = "rock" | "paper" | "scissors";
const RPS_LABEL: Record<Rps, string> = {
  rock: "石头",
  paper: "布",
  scissors: "剪刀",
};

function rpsWinner(a: Rps, b: Rps) {
  if (a === b) return 0;
  if (
    (a === "rock" && b === "scissors") ||
    (a === "scissors" && b === "paper") ||
    (a === "paper" && b === "rock")
  ) {
    return 1;
  }
  return -1;
}

export function RockPaperScissors({
  meName,
  partnerName,
}: {
  meName: string;
  partnerName?: string | null;
}) {
  const [mine, setMine] = useState<Rps | null>(null);
  const [theirs, setTheirs] = useState<Rps | null>(null);
  const [score, setScore] = useState({ me: 0, ta: 0 });
  const ta = partnerName ?? "命运";

  function play(choice: Rps) {
    const opp = pick(["rock", "paper", "scissors"] as Rps[]);
    setMine(choice);
    setTheirs(opp);
    const w = rpsWinner(choice, opp);
    if (w === 1) setScore((s) => ({ ...s, me: s.me + 1 }));
    if (w === -1) setScore((s) => ({ ...s, ta: s.ta + 1 }));
  }

  return (
    <div className="magic-card">
      <div className="magic-card-head">
        <h2>石头剪刀布</h2>
        <p>
          {meName} vs {ta} · {score.me}:{score.ta}
        </p>
      </div>
      <div className="inline-actions">
        {(["rock", "scissors", "paper"] as Rps[]).map((c) => (
          <button key={c} type="button" className="btn btn-ghost" onClick={() => play(c)}>
            {RPS_LABEL[c]}
          </button>
        ))}
      </div>
      {mine && theirs ? (
        <p className="play-result">
          你出{RPS_LABEL[mine]}，{ta}出{RPS_LABEL[theirs]} ·{" "}
          {rpsWinner(mine, theirs) === 0
            ? "平手"
            : rpsWinner(mine, theirs) === 1
              ? "你赢"
              : `${ta}赢`}
        </p>
      ) : null}
    </div>
  );
}

export function TalkTimer() {
  const [seconds, setSeconds] = useState(60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    if (seconds <= 0) {
      setRunning(false);
      return;
    }
    const t = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [running, seconds]);

  function start(n: number) {
    setSeconds(n);
    setRunning(true);
  }

  return (
    <div className="magic-card">
      <div className="magic-card-head">
        <h2>对聊计时</h2>
        <p>限定时间只聊彼此。时间到就互相拥抱一下。</p>
      </div>
      <p className={`talk-timer${seconds === 0 && !running ? " done" : ""}`}>
        {String(Math.floor(seconds / 60)).padStart(2, "0")}:
        {String(seconds % 60).padStart(2, "0")}
      </p>
      <div className="inline-actions">
        <button type="button" className="btn btn-accent" disabled={running} onClick={() => start(60)}>
          1 分钟
        </button>
        <button type="button" className="btn btn-ghost" disabled={running} onClick={() => start(180)}>
          3 分钟
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setRunning(false);
            setSeconds(60);
          }}
        >
          重置
        </button>
      </div>
      {seconds === 0 && !running ? <p className="form-success">时间到。抱抱？</p> : null}
    </div>
  );
}

export function MadLibsLetter() {
  const [tplIndex, setTplIndex] = useState(0);
  const tpl = MADLIB_TEMPLATES[tplIndex]!;
  const [words, setWords] = useState<string[]>(() => tpl.labels.map(() => ""));
  const [letter, setLetter] = useState<string | null>(null);

  function swapTemplate() {
    const next = (tplIndex + 1) % MADLIB_TEMPLATES.length;
    setTplIndex(next);
    setWords(MADLIB_TEMPLATES[next]!.labels.map(() => ""));
    setLetter(null);
  }

  return (
    <div className="magic-card">
      <div className="magic-card-head">
        <h2>填词情书</h2>
        <p>瞎填几个词，拼出一封只有你们懂的信。</p>
      </div>
      <div className="stack">
        {tpl.labels.map((label, i) => (
          <div className="field" key={`${tplIndex}-${label}`}>
            <label htmlFor={`mad-${i}`}>{label}</label>
            <input
              id={`mad-${i}`}
              value={words[i] ?? ""}
              onChange={(e) => {
                const next = [...words];
                next[i] = e.target.value;
                setWords(next);
              }}
              maxLength={20}
            />
          </div>
        ))}
      </div>
      <div className="inline-actions" style={{ marginTop: "0.75rem" }}>
        <button
          type="button"
          className="btn btn-accent"
          onClick={() => {
            if (words.some((w) => !w.trim())) return;
            setLetter(tpl.build(words.map((w) => w.trim())));
          }}
        >
          生成情书
        </button>
        <button type="button" className="btn btn-ghost" onClick={swapTemplate}>
          换模板
        </button>
      </div>
      {letter ? <pre className="report-body">{letter}</pre> : null}
    </div>
  );
}

const BINGO = [
  "互道早安",
  "一起吃饭不刷手机",
  "牵手走路",
  "说一句谢谢",
  "分享今日开心",
  "拥抱超过 10 秒",
  "一起听一首歌",
  "夸对方一句",
  "计划下次约会",
];

export function CoupleBingo() {
  const [checked, setChecked] = useState<boolean[]>(() => BINGO.map(() => false));

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("jianai-bingo");
      if (raw) {
        const parsed = JSON.parse(raw) as boolean[];
        if (Array.isArray(parsed) && parsed.length === BINGO.length) {
          setChecked(parsed);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  function toggle(i: number) {
    setChecked((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      try {
        window.localStorage.setItem("jianai-bingo", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const done = checked.filter(Boolean).length;

  return (
    <div className="magic-card">
      <div className="magic-card-head">
        <h2>甜蜜 Bingo</h2>
        <p>
          本周小任务 · 已完成 {done}/{BINGO.length}
        </p>
      </div>
      <div className="bingo-grid">
        {BINGO.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`bingo-cell${checked[i] ? " on" : ""}`}
            onClick={() => toggle(i)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
