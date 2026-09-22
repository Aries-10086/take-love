"use client";

import { useState } from "react";

export function CopyInviteButton({
  code,
  spaceName = "我们的捡爱",
}: {
  code: string;
  spaceName?: string;
}) {
  const [status, setStatus] = useState<"idle" | "ok" | "fail" | "shared">("idle");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl = `${origin}/onboarding?code=${encodeURIComponent(code)}`;
  const shareText = `来「${spaceName}」一起捡爱吧。邀请码：${code}\n打开链接加入：${joinUrl}`;

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("ok");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch {
      setStatus("fail");
      window.setTimeout(() => setStatus("idle"), 2200);
    }
  }

  async function share() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `${spaceName} · 捡爱邀请`,
          text: shareText,
          url: joinUrl,
        });
        setStatus("shared");
        window.setTimeout(() => setStatus("idle"), 1800);
        return;
      } catch {
        // fall through to copy
      }
    }
    await copy(shareText);
  }

  const label =
    status === "ok"
      ? "已复制"
      : status === "shared"
        ? "已分享"
        : status === "fail"
          ? "失败，请重试"
          : null;

  return (
    <div className="inline-actions">
      <button type="button" className="btn btn-accent" onClick={share}>
        {label ?? "邀请另一半"}
      </button>
      <button type="button" className="btn btn-ghost" onClick={() => copy(code)}>
        复制邀请码
      </button>
    </div>
  );
}
