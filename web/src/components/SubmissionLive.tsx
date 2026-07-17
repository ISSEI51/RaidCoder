"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Submission, SubmissionStatus } from "@/lib/database.types";

const TERMINAL_STATUSES: SubmissionStatus[] = ["AC", "WA", "TLE", "RE", "CE", "IE"];

// 未確定の提出をRealtime購読し、判定が付いたらページを再取得する
export function SubmissionLive({ submissionId }: { submissionId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  useEffect(() => {
    const channel = supabase
      .channel(`submission-live-${submissionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "submissions",
          filter: `id=eq.${submissionId}`,
        },
        (payload) => {
          const row = payload.new as Submission;
          if (TERMINAL_STATUSES.includes(row.status)) {
            router.refresh();
          }
        },
      )
      .subscribe();

    const poll = setInterval(async () => {
      const { data } = await supabase
        .from("submissions")
        .select("status")
        .eq("id", submissionId)
        .maybeSingle();
      if (data && TERMINAL_STATUSES.includes(data.status)) {
        router.refresh();
      }
    }, 3000);

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [supabase, submissionId, router]);

  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-400">
      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
      ジャッジ中… 結果は自動で更新されます
    </span>
  );
}
