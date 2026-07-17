// Supabase (service role) での DB 操作
// テーブル・RPC 定義の正は supabase/migrations/0001_init.sql
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { RANKS, type Rank } from './constants.js';

export interface RaidWeekRow {
  id: string;
  week_number: number;
  starts_at: string;
  ends_at: string;
  boss_name: string;
  status: 'upcoming' | 'active' | 'ended';
}

export interface TestCaseData {
  name: string;
  input: string;
  expectedOutput: string;
  isSample: boolean;
}

export interface ProblemPayload {
  rank: Rank;
  title: string;
  statementMd: string;
  timeLimitMs: number;
  baseDamage: number;
  testCases: TestCaseData[];
  editorialMd: string;
  officialSolutions: Array<{ language: string; code: string }>;
}

export interface WeekPayload {
  weekNumber: number;
  startsAt: string; // ISO 8601
  endsAt: string; // ISO 8601
  bossName: string;
  bossFlavor: string;
  bossMaxHp: number;
  problems: ProblemPayload[];
}

const WEEK_COLUMNS = 'id, week_number, starts_at, ends_at, boss_name, status';

export class Db {
  private readonly client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  /** week_number が最大の週(無ければ null) */
  async getLatestWeek(): Promise<RaidWeekRow | null> {
    const { data, error } = await this.client
      .from('raid_weeks')
      .select(WEEK_COLUMNS)
      .order('week_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`raid_weeks の取得に失敗: ${error.message}`);
    return data as RaidWeekRow | null;
  }

  /** 現在 active な週(無ければ null) */
  async getActiveWeek(): Promise<RaidWeekRow | null> {
    const { data, error } = await this.client
      .from('raid_weeks')
      .select(WEEK_COLUMNS)
      .eq('status', 'active')
      .order('week_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`active 週の取得に失敗: ${error.message}`);
    return data as RaidWeekRow | null;
  }

  /** 最も古い upcoming の週(無ければ null) */
  async getOldestUpcomingWeek(): Promise<RaidWeekRow | null> {
    const { data, error } = await this.client
      .from('raid_weeks')
      .select(WEEK_COLUMNS)
      .eq('status', 'upcoming')
      .order('week_number', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`upcoming 週の取得に失敗: ${error.message}`);
    return data as RaidWeekRow | null;
  }

  /** week_number で週を取得(無ければ null) */
  async getWeekByNumber(weekNumber: number): Promise<RaidWeekRow | null> {
    const { data, error } = await this.client
      .from('raid_weeks')
      .select(WEEK_COLUMNS)
      .eq('week_number', weekNumber)
      .maybeSingle();
    if (error) throw new Error(`第${weekNumber}週の取得に失敗: ${error.message}`);
    return data as RaidWeekRow | null;
  }

  /** RPC count_active_players() — 直近14日に提出したユーザー数(最低3) */
  async countActivePlayers(): Promise<number> {
    const { data, error } = await this.client.rpc('count_active_players');
    if (error) throw new Error(`count_active_players() の呼び出しに失敗: ${error.message}`);
    return data as number;
  }

  /** RPC finalize_week(p_week_id) */
  async finalizeWeek(weekId: string): Promise<unknown> {
    const { data, error } = await this.client.rpc('finalize_week', { p_week_id: weekId });
    if (error) throw new Error(`finalize_week() の呼び出しに失敗: ${error.message}`);
    return data;
  }

  /** RPC activate_week(p_week_id) */
  async activateWeek(weekId: string): Promise<unknown> {
    const { data, error } = await this.client.rpc('activate_week', { p_week_id: weekId });
    if (error) throw new Error(`activate_week() の呼び出しに失敗: ${error.message}`);
    return data;
  }

  /** 週を削除(problems / test_cases / problem_editorials は FK cascade で消える) */
  async deleteWeek(weekId: string): Promise<void> {
    const { error } = await this.client.from('raid_weeks').delete().eq('id', weekId);
    if (error) throw new Error(`週 ${weekId} の削除に失敗: ${error.message}`);
  }

  /**
   * 週が完全に生成済みかを確認する(rotate の冪等性のため)。
   * - 問題6問(S〜E 各1問)
   * - 各問題に解説(problem_editorials)
   * - 各問題にサンプル2件以上(+ requireHidden なら非サンプル10件以上)
   */
  async isWeekComplete(weekId: string, requireHidden: boolean): Promise<boolean> {
    const { data: problems, error: pErr } = await this.client
      .from('problems')
      .select('id, rank')
      .eq('week_id', weekId);
    if (pErr) throw new Error(`problems の取得に失敗: ${pErr.message}`);
    const rows = (problems ?? []) as Array<{ id: string; rank: string }>;
    if (rows.length !== RANKS.length) return false;
    const ranks = new Set(rows.map((p) => p.rank));
    if (RANKS.some((r) => !ranks.has(r))) return false;

    const ids = rows.map((p) => p.id);

    const { data: editorials, error: eErr } = await this.client
      .from('problem_editorials')
      .select('problem_id')
      .in('problem_id', ids);
    if (eErr) throw new Error(`problem_editorials の取得に失敗: ${eErr.message}`);
    if ((editorials ?? []).length !== ids.length) return false;

    const { data: cases, error: cErr } = await this.client
      .from('test_cases')
      .select('problem_id, is_sample')
      .in('problem_id', ids);
    if (cErr) throw new Error(`test_cases の取得に失敗: ${cErr.message}`);
    const sampleCount = new Map<string, number>();
    const hiddenCount = new Map<string, number>();
    for (const row of (cases ?? []) as Array<{ problem_id: string; is_sample: boolean }>) {
      const map = row.is_sample ? sampleCount : hiddenCount;
      map.set(row.problem_id, (map.get(row.problem_id) ?? 0) + 1);
    }
    return ids.every(
      (id) =>
        (sampleCount.get(id) ?? 0) >= 2 && (!requireHidden || (hiddenCount.get(id) ?? 0) >= 10),
    );
  }

  /**
   * 週を一括保存する。途中で失敗した場合は生成済みの週を削除してからエラーを投げ直す
   * (再実行で壊れないようにするため)。
   */
  async saveWeek(payload: WeekPayload): Promise<string> {
    const { data: week, error: weekErr } = await this.client
      .from('raid_weeks')
      .insert({
        week_number: payload.weekNumber,
        starts_at: payload.startsAt,
        ends_at: payload.endsAt,
        boss_name: payload.bossName,
        boss_flavor: payload.bossFlavor,
        boss_max_hp: payload.bossMaxHp,
        boss_hp: payload.bossMaxHp,
        status: 'upcoming',
      })
      .select('id')
      .single();
    if (weekErr || !week) {
      throw new Error(`raid_weeks の挿入に失敗: ${weekErr?.message ?? 'no data'}`);
    }
    const weekId = (week as { id: string }).id;

    try {
      // problems を一括挿入し、rank で problem_id を対応づける
      const { data: inserted, error: probErr } = await this.client
        .from('problems')
        .insert(
          payload.problems.map((p) => ({
            week_id: weekId,
            rank: p.rank,
            title: p.title,
            statement_md: p.statementMd,
            time_limit_ms: p.timeLimitMs,
            base_damage: p.baseDamage,
          })),
        )
        .select('id, rank');
      if (probErr || !inserted) {
        throw new Error(`problems の挿入に失敗: ${probErr?.message ?? 'no data'}`);
      }
      const idByRank = new Map(
        (inserted as Array<{ id: string; rank: Rank }>).map((row) => [row.rank, row.id]),
      );

      const testCaseRows: Array<Record<string, unknown>> = [];
      const editorialRows: Array<Record<string, unknown>> = [];
      for (const p of payload.problems) {
        const problemId = idByRank.get(p.rank);
        if (!problemId) throw new Error(`挿入した問題 (rank ${p.rank}) の id が見つかりません`);
        for (const tc of p.testCases) {
          testCaseRows.push({
            problem_id: problemId,
            name: tc.name,
            input: tc.input,
            expected_output: tc.expectedOutput,
            is_sample: tc.isSample,
          });
        }
        editorialRows.push({
          problem_id: problemId,
          editorial_md: p.editorialMd,
          official_solutions: p.officialSolutions,
        });
      }

      const { error: tcErr } = await this.client.from('test_cases').insert(testCaseRows);
      if (tcErr) throw new Error(`test_cases の挿入に失敗: ${tcErr.message}`);

      const { error: edErr } = await this.client.from('problem_editorials').insert(editorialRows);
      if (edErr) throw new Error(`problem_editorials の挿入に失敗: ${edErr.message}`);

      return weekId;
    } catch (err) {
      // 途中失敗時 cleanup: 生成済みの週を残さない
      try {
        await this.deleteWeek(weekId);
      } catch (cleanupErr) {
        throw new Error(
          `週の保存に失敗し、cleanup にも失敗しました。week_id=${weekId} を手動で削除してください。` +
            `\n保存エラー: ${err instanceof Error ? err.message : String(err)}` +
            `\ncleanup エラー: ${cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr)}`,
        );
      }
      throw err;
    }
  }
}
