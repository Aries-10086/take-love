"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MOODS, TAGS } from "@/lib/constants";

export function HomeFilter({
  mood,
  tag,
  q,
}: {
  mood?: string;
  tag?: string;
  q?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(q ?? "");

  function apply(next: { mood?: string; tag?: string; q?: string }) {
    const params = new URLSearchParams();
    const nextMood = next.mood ?? mood ?? "";
    const nextTag = next.tag ?? tag ?? "";
    const nextQ = next.q ?? query;
    if (nextMood) params.set("mood", nextMood);
    if (nextTag) params.set("tag", nextTag);
    if (nextQ.trim()) params.set("q", nextQ.trim());
    const qs = params.toString();
    router.push(qs ? `/home?${qs}` : "/home");
  }

  return (
    <div className="filter-bar">
      <form
        className="search-box"
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q: query });
        }}
      >
        <input
          type="search"
          name="q"
          value={query}
          placeholder="搜索时刻…"
          onChange={(e) => setQuery(e.target.value)}
          aria-label="搜索时刻"
        />
        <button className="btn btn-ghost" type="submit">
          搜索
        </button>
      </form>
      <select
        id="mood"
        name="mood"
        value={mood ?? ""}
        onChange={(e) => apply({ mood: e.target.value })}
        aria-label="心情筛选"
      >
        <option value="">全部心情</option>
        {MOODS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <select
        id="tag"
        name="tag"
        value={tag ?? ""}
        onChange={(e) => apply({ tag: e.target.value })}
        aria-label="标签筛选"
      >
        <option value="">全部标签</option>
        {TAGS.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      {(mood || tag || q) && (
        <Link className="btn btn-ghost" href="/home">
          清除
        </Link>
      )}
    </div>
  );
}
