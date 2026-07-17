// 出力比較ユーティリティ
// CONTRACT §1: 「stdout を末尾空白・末尾改行をトリムして期待出力と厳密比較」
// 具体的には「各行の末尾空白を除去」+「末尾の空行を除去」した上で行単位の厳密比較を行う。
// 期待出力(expected_output)は Judge0 へは送らず、比較は必ずこちらで行う。

/** 各行の末尾空白(スペース・タブ・CR 等)を除去し、末尾の空行を取り除いた行配列へ正規化する */
function normalizeLines(text: string): string[] {
  const lines = text.split('\n').map((line) => line.replace(/\s+$/u, ''));
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
}

/** 実行結果の stdout と期待出力を比較する(true なら AC 相当) */
export function compareOutput(actual: string, expected: string): boolean {
  const actualLines = normalizeLines(actual);
  const expectedLines = normalizeLines(expected);
  if (actualLines.length !== expectedLines.length) {
    return false;
  }
  return actualLines.every((line, i) => line === expectedLines[i]);
}
