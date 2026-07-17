import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

// ブラウザ用 Supabase クライアント(anon key のみ。service role は web では絶対に使わない)
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
