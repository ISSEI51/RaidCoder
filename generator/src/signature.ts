// LeetCode(関数実装)形式の関数シグネチャ定義とワイヤ形式(シリアライズ仕様)
//
// AI はシグネチャ(関数名・引数・戻り値の型)だけを出力し、
// 各言語のエディタ用テンプレートとジャッジ用ハーネスは codegen.ts が決定的に生成する。
// テストケース(stdin/stdout)は下記ワイヤ形式でシリアライズされる。
import { z } from 'zod';

/** 引数に使える型 */
export const PARAM_TYPES = ['int', 'str', 'bool', 'int[]', 'str[]', 'int[][]'] as const;
/** 戻り値に使える型 */
export const RETURN_TYPES = ['int', 'str', 'bool', 'int[]', 'str[]'] as const;

export type ParamType = (typeof PARAM_TYPES)[number];
export type ReturnType = (typeof RETURN_TYPES)[number];

export const signatureSchema = z.object({
  function_name: z.string().regex(/^[a-z][A-Za-z0-9]*$/, 'lowerCamelCase にすること'),
  params: z
    .array(
      z.object({
        name: z.string().regex(/^[a-z][A-Za-z0-9]*$/, 'lowerCamelCase にすること'),
        type: z.enum(PARAM_TYPES),
      }),
    )
    .min(1)
    .max(6),
  returns: z.enum(RETURN_TYPES),
});

export type Signature = z.infer<typeof signatureSchema>;

/**
 * ワイヤ形式(テストケースの stdin/stdout 表現)の仕様書。
 * プロンプト(case_generator_py / samples の指示)とハーネス実装の共通の正。
 */
export const WIRE_FORMAT_DOC = `引数は宣言順に、次の形式で標準入力にシリアライズする:
- int / str / bool: 1行(bool は true / false)
- int[]: 1行目に要素数 n、2行目に n 個の整数を空白区切り(n=0 でも空の2行目を出す)
- str[]: 1行目に要素数 n、続く n 行に各要素
- int[][]: 1行目に行数 r、続く r 行に「その行の要素数 m、続けて m 個の整数」を空白区切り
戻り値は次の形式で標準出力に出力される:
- int / str / bool: 1行(bool は true / false)
- int[]: 1行に空白区切り(空なら空行)
- str[]: 各要素を1行ずつ`;

/** lowerCamelCase → snake_case(Rust 用) */
export function toSnakeCase(name: string): string {
  return name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}
