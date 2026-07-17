import Link from "next/link";
import { ratingTextClass } from "@/lib/rating";

// レート色付きのユーザー名リンク(色分けは CONTRACT §5 のしきい値を共通使用)
export function UserLink({
  handle,
  rating,
  avatarUrl,
  showAvatar = false,
}: {
  handle: string;
  rating: number;
  avatarUrl?: string | null;
  showAvatar?: boolean;
}) {
  return (
    <Link
      href={`/users/${encodeURIComponent(handle)}`}
      className={`inline-flex items-center gap-1.5 font-bold hover:underline ${ratingTextClass(rating)}`}
    >
      {showAvatar &&
        (avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-5 w-5 rounded-full border border-slate-600"
            loading="lazy"
          />
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-[10px] text-slate-300">
            {handle.slice(0, 1).toUpperCase()}
          </span>
        ))}
      {handle}
    </Link>
  );
}
