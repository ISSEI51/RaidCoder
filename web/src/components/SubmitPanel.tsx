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
import { createClient } from "@/lib/supabase/client";
import type {
  Submission,
  SubmissionLanguage,
  SubmissionStatus,
} from "@/lib/database.types";
import { CODE_TEMPLATES, LANGUAGES } from "@/lib/languages";
import { StatusBadge } from "@/components/StatusBadge";
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
      {/* AC ダメージの全画面演出 */}
      {burst && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          <div className="damage-burst text-center">
            <div className="text-8xl" aria-hidden>
              💥
            </div>
            <div className="mt-2 text-6xl font-black text-yellow-300 drop-shadow-[0_0_20px_rgba(250,204,21,0.9)] sm:text-7xl">
              -{formatInt(burst.damage)}
            </div>
            <div className="mt-1 text-2xl font-black tracking-widest text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]">
              DAMAGE!!
            </div>
            {burst.firstBlood && (
              <div className="mt-2 text-2xl font-black text-amber-300 victory-glow">
                ⚡ FIRST BLOOD! ×1.5
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-black tracking-widest text-purple-300">
            ⚔️ 攻撃(コード提出)
          </h2>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as SubmissionLanguage)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm font-bold text-slate-200"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {weekStatus === "ended" && (
          <p className="mb-3 rounded-lg border border-slate-600/50 bg-slate-800/60 px-3 py-2 text-xs text-slate-400">
            この週は終了しています。練習として提出できますが、ダメージは入りません。
          </p>
        )}

        <div className="overflow-hidden rounded-lg border border-slate-700">
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

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || judging}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 px-6 py-2.5 font-black text-white shadow-lg shadow-rose-900/50 transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            {submitting ? "提出中…" : judging ? "ジャッジ中…" : "⚔️ 提出して攻撃!"}
          </button>
          {errorMsg && <p className="text-sm text-rose-400">{errorMsg}</p>}
        </div>

        {/* 判定結果 */}
        {current && (
          <div
            className={`mt-4 rounded-xl border p-4 ${
              current.status === "AC"
                ? "border-emerald-500/50 bg-emerald-500/10"
                : TERMINAL_STATUSES.includes(current.status)
                  ? "border-amber-500/40 bg-amber-500/5"
                  : "border-slate-600/50 bg-slate-800/40"
            }`}
          >
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={current.status} />
              {judging && (
                <span className="inline-flex items-center gap-2 text-sm text-slate-400">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                  ボスに攻撃を仕掛けています…
                </span>
              )}
              {TERMINAL_STATUSES.includes(current.status) && (
                <>
                  <span className="font-mono text-sm text-slate-300">
                    {current.passed_count} / {current.total_count} ケース通過
                  </span>
                  {current.exec_time_ms !== null && (
                    <span className="font-mono text-xs text-slate-400">
                      {current.exec_time_ms} ms
                    </span>
                  )}
                  {current.memory_kb !== null && (
                    <span className="font-mono text-xs text-slate-400">
                      {formatInt(current.memory_kb)} KB
                    </span>
                  )}
                </>
              )}
            </div>
            {current.status === "AC" && (
              <p className="mt-2 text-sm font-bold text-emerald-300">
                {current.damage > 0 ? (
                  <>
                    💥 ボスに {formatInt(current.damage)} ダメージ!
                    {current.is_first_blood && (
                      <span className="ml-2 text-amber-300">⚡ FIRST BLOOD (×1.5)</span>
                    )}
                  </>
                ) : (
                  "AC! (既に AC 済みか週終了後のためダメージは 0 です)"
                )}
              </p>
            )}
            {TERMINAL_STATUSES.includes(current.status) && (
              <p className="mt-2 text-xs text-slate-400">
                <Link
                  href={`/submissions/${current.id}`}
                  className="text-sky-400 hover:underline"
                >
                  提出詳細を見る →
                </Link>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
