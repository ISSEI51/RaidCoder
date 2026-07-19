// supabase/migrations/0001_init.sql と一致させた手書きの DB 型定義。
// スキーマ変更時は 0001_init.sql(正)に合わせてこのファイルも更新すること。

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type RaidWeekStatus = "upcoming" | "active" | "ended";
export type ProblemRank = "S" | "A" | "B" | "C" | "D" | "E";
export type SubmissionLanguage = "python" | "rust" | "typescript" | "java";
export type SubmissionStatus =
  | "pending"
  | "running"
  | "AC"
  | "WA"
  | "TLE"
  | "RE"
  | "CE"
  | "IE";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          handle: string;
          avatar_url: string | null;
          rating: number;
          exp: number;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          handle: string;
          avatar_url?: string | null;
          rating?: number;
          exp?: number;
          is_admin?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          handle?: string;
          avatar_url?: string | null;
          rating?: number;
          exp?: number;
          is_admin?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      raid_weeks: {
        Row: {
          id: string;
          week_number: number;
          starts_at: string;
          ends_at: string;
          boss_name: string;
          boss_flavor: string;
          boss_max_hp: number;
          boss_hp: number;
          status: RaidWeekStatus;
          defeated_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          week_number: number;
          starts_at: string;
          ends_at: string;
          boss_name: string;
          boss_flavor?: string;
          boss_max_hp: number;
          boss_hp: number;
          status?: RaidWeekStatus;
          defeated_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          week_number?: number;
          starts_at?: string;
          ends_at?: string;
          boss_name?: string;
          boss_flavor?: string;
          boss_max_hp?: number;
          boss_hp?: number;
          status?: RaidWeekStatus;
          defeated_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      problems: {
        Row: {
          id: string;
          week_id: string;
          rank: ProblemRank;
          title: string;
          statement_md: string;
          time_limit_ms: number;
          memory_limit_kb: number;
          base_damage: number;
          created_at: string;
          signature: Json | null;
          code_templates: Record<string, string> | null;
          judge_harnesses: Record<string, string> | null;
        };
        Insert: {
          id?: string;
          week_id: string;
          rank: ProblemRank;
          title: string;
          statement_md: string;
          time_limit_ms?: number;
          memory_limit_kb?: number;
          base_damage: number;
          created_at?: string;
          signature?: Json | null;
          code_templates?: Record<string, string> | null;
          judge_harnesses?: Record<string, string> | null;
        };
        Update: {
          id?: string;
          week_id?: string;
          rank?: ProblemRank;
          title?: string;
          statement_md?: string;
          time_limit_ms?: number;
          memory_limit_kb?: number;
          base_damage?: number;
          created_at?: string;
          signature?: Json | null;
          code_templates?: Record<string, string> | null;
          judge_harnesses?: Record<string, string> | null;
        };
        Relationships: [];
      };
      problem_editorials: {
        Row: {
          problem_id: string;
          editorial_md: string;
          official_solutions: Json;
        };
        Insert: {
          problem_id: string;
          editorial_md: string;
          official_solutions?: Json;
        };
        Update: {
          problem_id?: string;
          editorial_md?: string;
          official_solutions?: Json;
        };
        Relationships: [];
      };
      test_cases: {
        Row: {
          id: string;
          problem_id: string;
          name: string;
          input: string;
          expected_output: string;
          is_sample: boolean;
        };
        Insert: {
          id?: string;
          problem_id: string;
          name: string;
          input: string;
          expected_output: string;
          is_sample?: boolean;
        };
        Update: {
          id?: string;
          problem_id?: string;
          name?: string;
          input?: string;
          expected_output?: string;
          is_sample?: boolean;
        };
        Relationships: [];
      };
      submissions: {
        Row: {
          id: string;
          problem_id: string;
          user_id: string;
          language: SubmissionLanguage;
          code: string;
          status: SubmissionStatus;
          passed_count: number;
          total_count: number;
          exec_time_ms: number | null;
          memory_kb: number | null;
          damage: number;
          is_first_blood: boolean;
          created_at: string;
          judged_at: string | null;
        };
        // クライアントが書けるのは grant のとおり4列のみ(他は DB default)
        Insert: {
          problem_id: string;
          user_id: string;
          language: SubmissionLanguage;
          code: string;
        };
        Update: {
          problem_id?: string;
          user_id?: string;
          language?: SubmissionLanguage;
          code?: string;
        };
        Relationships: [];
      };
      board_threads: {
        Row: {
          id: string;
          problem_id: string | null;
          week_id: string | null;
          title: string;
          author_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          problem_id?: string | null;
          week_id?: string | null;
          title: string;
          author_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          problem_id?: string | null;
          week_id?: string | null;
          title?: string;
          author_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      board_posts: {
        Row: {
          id: string;
          thread_id: string;
          author_id: string;
          body_md: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          author_id: string;
          body_md: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          author_id?: string;
          body_md?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      rating_events: {
        Row: {
          id: string;
          user_id: string;
          week_id: string;
          damage_total: number;
          rank: number;
          performance: number;
          rating_before: number;
          rating_after: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_id: string;
          damage_total: number;
          rank: number;
          performance: number;
          rating_before: number;
          rating_after: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          week_id?: string;
          damage_total?: number;
          rank?: number;
          performance?: number;
          rating_before?: number;
          rating_after?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      week_participant_counts: {
        Row: {
          week_id: string;
          participant_count: number;
        };
        Relationships: [];
      };
      board_thread_post_counts: {
        Row: {
          thread_id: string;
          post_count: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_week_leaderboard: {
        Args: { p_week_id: string };
        Returns: {
          user_id: string;
          handle: string;
          avatar_url: string | null;
          rating: number;
          total_damage: number;
          solved_count: number;
          last_ac_at: string | null;
        }[];
      };
      get_problem_stats: {
        Args: { p_week_id: string };
        Returns: {
          problem_id: string;
          ac_user_count: number;
          attempt_user_count: number;
          first_blood_handle: string | null;
        }[];
      };
      get_recent_activity: {
        Args: { p_week_id: string; p_limit?: number };
        Returns: {
          submission_id: string;
          handle: string;
          avatar_url: string | null;
          problem_id: string;
          problem_rank: string;
          problem_title: string;
          damage: number;
          is_first_blood: boolean;
          judged_at: string;
        }[];
      };
      has_ac: {
        Args: { p_problem_id: string; p_user_id: string };
        Returns: boolean;
      };
      week_status_of_problem: {
        Args: { p_problem_id: string };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Profile = Tables<"profiles">;
export type RaidWeek = Tables<"raid_weeks">;
export type Problem = Tables<"problems">;
export type ProblemEditorial = Tables<"problem_editorials">;
export type TestCase = Tables<"test_cases">;
export type Submission = Tables<"submissions">;
export type BoardThread = Tables<"board_threads">;
export type BoardPost = Tables<"board_posts">;
export type RatingEvent = Tables<"rating_events">;

export type LeaderboardEntry =
  Database["public"]["Functions"]["get_week_leaderboard"]["Returns"][number];
export type ProblemStats =
  Database["public"]["Functions"]["get_problem_stats"]["Returns"][number];
export type ActivityEntry =
  Database["public"]["Functions"]["get_recent_activity"]["Returns"][number];
