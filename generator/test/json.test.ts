// JSON 抽出パーサのテスト
import { describe, expect, it } from 'vitest';
import { extractJson } from '../src/json.js';

describe('extractJson', () => {
  it('素の JSON オブジェクトをパースできる', () => {
    expect(extractJson('{"a": 1, "b": "text"}')).toEqual({ a: 1, b: 'text' });
  });

  it('前後に空白があってもパースできる', () => {
    expect(extractJson('  \n {"a": 1} \n ')).toEqual({ a: 1 });
  });

  it('トップレベルの配列をパースできる', () => {
    expect(extractJson('[1, 2, 3]')).toEqual([1, 2, 3]);
  });

  it('```json フェンス内の JSON を抽出できる', () => {
    const text = '説明文です。\n```json\n{"boss_name": "竜"}\n```\n以上です。';
    expect(extractJson(text)).toEqual({ boss_name: '竜' });
  });

  it('言語タグなしの ``` フェンス内の JSON を抽出できる', () => {
    const text = '結果:\n```\n{"x": true}\n```';
    expect(extractJson(text)).toEqual({ x: true });
  });

  it('壊れたフェンスがあっても後続の ```json フェンスを使う', () => {
    const text = '```json\n{壊れている}\n```\n```json\n{"ok": 1}\n```';
    expect(extractJson(text)).toEqual({ ok: 1 });
  });

  it('フェンスがなく地の文に埋まった JSON を抽出できる', () => {
    const text = 'はい、こちらが結果です: {"answer": 42, "nested": {"k": [1, 2]}} 以上。';
    expect(extractJson(text)).toEqual({ answer: 42, nested: { k: [1, 2] } });
  });

  it('文字列中の波括弧に惑わされない', () => {
    const text = '結果 {"code": "if (x) { return \'}\'; }", "n": 1} でした';
    expect(extractJson(text)).toEqual({ code: "if (x) { return '}'; }", n: 1 });
  });

  it('文字列中のエスケープされた引用符を処理できる', () => {
    const text = 'x {"quote": "彼は \\"やあ\\" と言った"} y';
    expect(extractJson(text)).toEqual({ quote: '彼は "やあ" と言った' });
  });

  it('改行エスケープを含む JSON を処理できる', () => {
    const text = '```json\n{"code": "print(1)\\nprint(2)\\n"}\n```';
    expect(extractJson(text)).toEqual({ code: 'print(1)\nprint(2)\n' });
  });

  it('最初の { が不正でも後続の JSON を拾える', () => {
    const text = '{not json} だが {"valid": true} はある';
    expect(extractJson(text)).toEqual({ valid: true });
  });

  it('JSON が見つからなければエラーを投げる', () => {
    expect(() => extractJson('JSON はどこにもありません')).toThrow(/JSON を抽出できません/);
  });

  it('閉じられていない括弧だけの場合はエラーを投げる', () => {
    expect(() => extractJson('{"a": 1')).toThrow();
  });
});
