// AI 出力から JSON を頑健に抽出するパーサ
//
// 試行順序:
//   1. テキスト全体をそのまま JSON.parse
//   2. ```json フェンス内
//   3. 任意の ``` フェンス内
//   4. バランスの取れた最初の { ... } / [ ... ] 部分文字列

function tryParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

function* fencedBlocks(text: string): Generator<{ lang: string; body: string }> {
  const re = /```([^\n`]*)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    yield { lang: (m[1] ?? '').trim().toLowerCase(), body: m[2] ?? '' };
  }
}

/** start 位置の '{' / '[' に対応する閉じ括弧の位置を返す(文字列リテラル・エスケープ対応) */
function findBalancedEnd(text: string, start: number): number {
  const open = text[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === '\\') {
        i++; // エスケープされた次の文字をスキップ
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
    } else if (c === open) {
      depth++;
    } else if (c === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function scanBalanced(text: string): unknown {
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c !== '{' && c !== '[') continue;
    const end = findBalancedEnd(text, i);
    if (end === -1) continue;
    const parsed = tryParse(text.slice(i, end + 1));
    if (parsed !== undefined) return parsed;
  }
  return undefined;
}

/**
 * AI の応答テキストから JSON 値を抽出する。
 * 見つからなければ Error を投げる。
 */
export function extractJson(text: string): unknown {
  // 1. 全体
  const whole = tryParse(text.trim());
  if (whole !== undefined) return whole;

  // 2. ```json フェンス優先
  for (const block of fencedBlocks(text)) {
    if (block.lang === 'json') {
      const parsed = tryParse(block.body.trim());
      if (parsed !== undefined) return parsed;
    }
  }

  // 3. 任意のフェンス
  for (const block of fencedBlocks(text)) {
    if (block.lang !== 'json') {
      const parsed = tryParse(block.body.trim());
      if (parsed !== undefined) return parsed;
    }
  }

  // 4. バランスの取れた最初の JSON 部分文字列
  const scanned = scanBalanced(text);
  if (scanned !== undefined) return scanned;

  throw new Error(`AI の応答から JSON を抽出できませんでした(先頭200文字): ${text.slice(0, 200)}`);
}
