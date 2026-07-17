"use client";

import { useState, type ReactNode } from "react";

// サーバーコンポーネントから content(ReactNode)を受け取る汎用タブ
export function Tabs({
  items,
  initialKey,
}: {
  items: { key: string; label: string; content: ReactNode }[];
  initialKey?: string;
}) {
  const [active, setActive] = useState(initialKey ?? items[0]?.key);

  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-slate-700/60">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActive(item.key)}
            className={`-mb-px rounded-t-lg border-b-2 px-4 py-2 text-sm font-bold transition-colors ${
              active === item.key
                ? "border-purple-400 bg-slate-800/60 text-purple-200"
                : "border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="pt-4">
        {items.map((item) => (
          <div key={item.key} className={active === item.key ? "" : "hidden"}>
            {item.content}
          </div>
        ))}
      </div>
    </div>
  );
}
