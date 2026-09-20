"use client";

import { useState } from "react";

export function CharCount({
  max,
  name,
  defaultValue = "",
}: {
  max: number;
  name: string;
  defaultValue?: string;
}) {
  const [count, setCount] = useState(defaultValue.length);

  return (
    <div className="char-count-wrap">
      <textarea
        id={name}
        name={name}
        required
        maxLength={max}
        defaultValue={defaultValue}
        placeholder="例如：晚饭后沿着江边走了很久，风有点凉，但很舒服。"
        onChange={(e) => setCount(e.target.value.length)}
      />
      <span className={`char-count${count > max * 0.9 ? " warn" : ""}`}>
        {count}/{max}
      </span>
    </div>
  );
}
