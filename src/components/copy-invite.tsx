"use client";

import { useState } from "react";

export function CopyInviteButton({
  code,
  spaceName = "我们的捡爱",
}: {
  code: string;
  spaceName?: string;
}) {
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");

  const shareText = `来「${spaceName}」一起捡爱吧。邀请码：${code}（打开捡爱 → 加入空间）`;

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("ok");
      window.setTimeout(() => setCopied("idle"), 1800);
    } catch {
      setCopied("fail");
      window.setTimeout(() => setCopied("idle"), 2200);
    }
  }

  return (
    <div className="inline-actions">
      <button type="button" className="btn btn-ghost" onClick={() => copy(code)}>
        {copied === "ok" ? "已复制" : copied === "fail" ? "复制失败" : "复制邀请码"}
      </button>
      <button type="button" className="btn btn-ghost" onClick={() => copy(shareText)}>
        复制邀请文案
      </button>
    </div>
  );
}
