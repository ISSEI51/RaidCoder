"use client";

import type { ReactNode } from "react";
import {
  Tabs as ShadcnTabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// サーバーコンポーネントから content(ReactNode)を受け取る汎用タブ。
// shadcn/ui Tabs(ui/tabs)の薄いラッパーで、props API は従来のまま。
// content は forceMount で常時マウントし、非アクティブ時は CSS で隠す
// (タブ切替でフォーム入力などの状態が失われないようにする)。
export function Tabs({
  items,
  initialKey,
}: {
  items: { key: string; label: ReactNode; content: ReactNode }[];
  initialKey?: string;
}) {
  return (
    <ShadcnTabs defaultValue={initialKey ?? items[0]?.key}>
      <div className="overflow-x-auto pb-1">
        <TabsList variant="line" className="w-max justify-start">
          {items.map((item) => (
            <TabsTrigger key={item.key} value={item.key} className="flex-none px-3">
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {items.map((item) => (
        <TabsContent
          key={item.key}
          value={item.key}
          forceMount
          className="data-[state=inactive]:hidden"
        >
          {item.content}
        </TabsContent>
      ))}
    </ShadcnTabs>
  );
}
