"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { javascript } from "@codemirror/lang-javascript";
import { java } from "@codemirror/lang-java";
import type { Extension } from "@codemirror/state";
import { Flame, Info, LoaderCircle, Swords, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  Submission,
  SubmissionLanguage,
  SubmissionStatus,
} from "@/lib/database.types";
import { CODE_TEMPLATES, LANGUAGES } from "@/lib/languages";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatInt } from "@/lib/format";

const TERMINAL_STATUSES: SubmissionStatus[] = ["AC", "WA", "TLE", "RE", "CE", "IE"];

const EXTENSIONS: Record<SubmissionLanguage, Extension[]> = {
  python: [python()],
  rust: [rust()],
  typescript: [javascript({ typescript: true })],
  java: [java()],
};

// コード提出パネル:
//   submissions へ insert(problem_id, user_id, language, code のみ。他列は DB default)
//   → 自分の提出行を Realtime 購読して判定結果をその場に表示
export function SubmitPanel({
  problemId,
  userId,
  weekStatus,
}: {
  problemId: string;
  userId: string;
  weekStatus: "active" | "ended";
}) {
  const [language, setLanguage] = useState<SubmissionLanguage>("python");
  const [codes, setCodes] = useState<Record<SubmissionLanguage, string>>({
    ...CODE_TEMPLATES,
  });
  const [submitting, setSubmitting] = useState(false);
  const [current, setCurrent] = useState<Submission | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [burst, setBurst] = useState<{
    damage: number;
    firstBlood: boolean;
  } | null>(null);

  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => cleanupRef.current?.();
  }, []);

  const finishWatch = () => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  };

  const handleJudged = (row: Submission) => {
    if (!TERMINAL_STATUSES.includes(row.status)) {
      setCurrent(row); // running への遷移など
      return;
    }
    finishWatch();
    setCurrent(row);
    if (row.status === "AC" && row.damage > 0) {
      setBurst({ damage: row.damage, firstBlood: row.is_first_blood });
      setTimeout(() => setBurst(null), 2600);
    }
    // 提出履歴・HP バーなどサーバー取得部分を更新
    router.refresh();
  };

  const handleSubmit = async () => {
    const code = codes[language];
    if (!code.trim()) {
      setErrorMsg("コードが空です");
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);
    setCurrent(null);

    const { data, error } = await supabase
      .from("submissions")
      .insert({
        problem_id: problemId,
        user_id: userId,
        language,
        code,
      })
      .select("*")
      .single();

    setSubmitting(false);
    if (error || !data) {
      setErrorMsg(`提出に失敗しました: ${error?.message ?? "不明なエラー"}`);
      return;
    }

    setCurrent(data);

    // Realtime 購読(取りこぼし対策で軽いポーリングも併用)
    const channel = supabase
      .channel(`submission-${data.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "submissions",
          filter: `id=eq.${data.id}`,
        },
        (payload) => handleJudged(payload.new as Submission),
      )
      .subscribe();

    const poll = setInterval(async () => {
      const { data: row } = await supabase
        .from("submissions")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();
      if (row && TERMINAL_STATUSES.includes(row.status)) {
        handleJudged(row);
      }
    }, 3000);

    cleanupRef.current = () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  };

  const judging =
    current !== null && !TERMINAL_STATUSES.includes(current.status);

  return (
    <div className="relative">
      {/* AC ダメージの全画面演出(damage-burst は globals.css のゲーム演出) */}
      {burst && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          <div className="damage-burst text-center">
            <Swords className="mx-auto size-14 text-destructive" aria-hidden />
            <div className="mt-2 text-6xl font-black text-foreground tabular-nums sm:text-7xl">
              -{formatInt(burst.damage)}
            </div>
            <div className="mt-1 text-xl font-black tracking-[0.3em] text-destructive">
              DAMAGE
            </div>
            {burst.firstBlood && (
              <div className="victory-glow mt-3 inline-flex items-center gap-1.5 text-xl font-black text-foreground">
                <Zap className="size-5" aria-hidden />
                FIRST BLOOD ×1.5
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Swords className="size-5 text-muted-foreground" aria-hidden />
            攻撃(コード提出)
          </h2>
          <Select
            value={language}
            onValueChange={(value) => setLanguage(value as SubmissionLanguage)}
          >
            <SelectTrigger size="sm" aria-label="提出言語">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {weekStatus === "ended" && (
          <p className="mb-3 flex items-start gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
            この週は終了しています。練習として提出できますが、ダメージは入りません。
          </p>
        )}

        <div className="overflow-hidden rounded-lg border border-border">
          <CodeMirror
            value={codes[language]}
            height="360px"
            theme="dark"
            extensions={EXTENSIONS[language]}
            onChange={(value) =>
              setCodes((prev) => ({ ...prev, [language]: value }))
            }
            basicSetup={{ tabSize: 4 }}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || judging}
          >
            <Swords aria-hidden />
            {submitting ? "提出中…" : judging ? "ジャッジ中…" : "提出して攻撃"}
          </Button>
          {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
        </div>

        {/* 判定結果 */}
        {current && (
          <div className="mt-4 rounded-lg border border-border bg-secondary/40 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={current.status} />
              {judging && (
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                  ボスに攻撃を仕掛けています…
                </span>
              )}
              {TERMINAL_STATUSES.includes(current.status) && (
                <>
                  <span className="text-sm text-foreground tabular-nums">
                    {current.passed_count} / {current.total_count} ケース通過
                  </span>
                  {current.exec_time_ms !== null && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {current.exec_time_ms} ms
                    </span>
                  )}
                  {current.memory_kb !== null && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatInt(current.memory_kb)} KB
                    </span>
                  )}
                </>
              )}
            </div>
            {current.status === "AC" && (
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm font-bold text-foreground">
                {current.damage > 0 ? (
                  <>
                    <Flame className="size-4 text-muted-foreground" aria-hidden />
                    <span>
                      ボスに{" "}
                      <span className="tabular-nums">
                        {formatInt(current.damage)}
                      </span>{" "}
                      ダメージ
                    </span>
                    {current.is_first_blood && (
                      <span className="inline-flex items-center gap-1 text-primary">
                        <Zap className="size-3" aria-hidden />
                        FIRST BLOOD ×1.5
                      </span>
                    )}
                  </>
                ) : (
                  "AC(既に AC 済みか週終了後のためダメージは 0)"
                )}
              </p>
            )}
            {TERMINAL_STATUSES.includes(current.status) && (
              <p className="mt-2">
                <Link
                  href={`/submissions/${current.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  提出詳細を見る
                </Link>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
