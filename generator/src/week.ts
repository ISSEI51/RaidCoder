// JST の週境界計算 (CONTRACT §6: 週 = 月曜 00:00 JST 〜 翌月曜 00:00 JST)
import { DateTime } from 'luxon';

export const RAID_TIMEZONE = 'Asia/Tokyo';

/** dt を含む週の月曜 00:00 (Asia/Tokyo) を返す */
export function jstWeekStart(dt: DateTime): DateTime {
  return dt.setZone(RAID_TIMEZONE).startOf('week'); // luxon は ISO 週(月曜始まり)
}

export interface WeekBounds {
  startsAt: DateTime;
  endsAt: DateTime;
}

/**
 * 週切替の猶予(分)。cron が月曜 00:00 JST より僅かに早く起動しても
 * 週を終了・切替できるようにするためのもの。
 * finalize 判定と「upcoming 週の期限切れ」判定で共通に使う。
 */
export const ROTATE_GRACE_MINUTES = 1;

/**
 * 週(の ends_at)が期限切れかどうか。
 * 期限切れの週を activate すると、以後の提出はすべて created_at >= ends_at となり
 * apply_submission_result のダメージ条件を満たせない(全 AC がダメージ0)ため、
 * activate 前に必ずこの判定を通すこと。
 */
export function isWeekExpired(endsAt: DateTime, now: DateTime): boolean {
  return !endsAt.isValid || now.plus({ minutes: ROTATE_GRACE_MINUTES }) >= endsAt;
}

/**
 * 次に生成する週の境界を返す。
 *
 * - 直前の週の ends_at が「現在の週の月曜 00:00 JST」以降なら、そこから連続させる。
 *   - 通常運用: rotate は月曜 00:00 JST に走るため、直前週の ends_at = ちょうど今始まった週の月曜になる
 *   - 週の途中で先行生成した場合: 次の月曜からの週になる
 * - 直前の週が無い(初回)、または ends_at が過去すぎる(長期停止後)場合は、
 *   現在の週の月曜 00:00 JST から始める(即プレイ可能な週になる)
 * - 計算した週が既に期限切れ(cron が月曜 00:00 の直前に起動した場合など)なら、
 *   1 週進めて期限切れの週を生成しないことを保証する
 */
export function nextWeekBounds(now: DateTime, prevEndsAt?: DateTime): WeekBounds {
  const currentWeekStart = jstWeekStart(now);
  let startsAt: DateTime;
  if (prevEndsAt !== undefined && prevEndsAt.isValid && prevEndsAt >= currentWeekStart) {
    // ends_at は本来ちょうど月曜 00:00 JST。念のため週境界にアラインする
    startsAt = jstWeekStart(prevEndsAt);
  } else {
    startsAt = currentWeekStart;
  }
  // 期限切れの週を返さない(startsAt >= 現在週の月曜のため、1 週進めれば必ず十分先になる)
  if (isWeekExpired(startsAt.plus({ weeks: 1 }), now)) {
    startsAt = startsAt.plus({ weeks: 1 });
  }
  return { startsAt, endsAt: startsAt.plus({ weeks: 1 }) };
}
