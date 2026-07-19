// コール1: 週テーマ(ボス+問題6問の概要)の生成
import { characterForWeek } from '../characters.js';
import { MAX_THEME_ATTEMPTS, RANKS } from '../constants.js';
import { extractJson } from '../json.js';
import { log, warn } from '../log.js';
import { buildThemeUserPrompt, THEME_SYSTEM } from '../prompts.js';
import type { AIProvider } from '../providers/types.js';
import { themeSchema, type Theme } from '../schemas.js';

export async function generateTheme(provider: AIProvider, weekNumber: number): Promise<Theme> {
  const character = characterForWeek(weekNumber);
  log(`第${weekNumber}週のキャラクター: ${character.role}(${character.tool} / ${character.creature})`);
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_THEME_ATTEMPTS; attempt++) {
    try {
      log(`週テーマを生成中... (第${weekNumber}週, 試行 ${attempt}/${MAX_THEME_ATTEMPTS})`);
      const raw = await provider.complete(THEME_SYSTEM, buildThemeUserPrompt(weekNumber, character));
      const theme = themeSchema.parse(extractJson(raw));
      // 表示・生成順を S → E に揃える
      theme.problems.sort((a, b) => RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank));
      return theme;
    } catch (err) {
      lastError = err;
      warn(`週テーマの生成に失敗 (試行 ${attempt}/${MAX_THEME_ATTEMPTS}): ${errMessage(err)}`);
    }
  }
  throw new Error(`週テーマの生成に ${MAX_THEME_ATTEMPTS} 回失敗しました: ${errMessage(lastError)}`);
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
