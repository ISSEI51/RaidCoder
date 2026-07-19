// シグネチャから各言語のエディタ用テンプレートとジャッジ用ハーネスを決定的に生成する。
//
// - テンプレート: ユーザーがエディタで見る関数スタブ(problems.code_templates)
// - ハーネス: 提出コードの末尾に連結され、ワイヤ形式(signature.ts)の stdin を
//   パースして関数を呼び、戻り値を標準出力へ書き出す(problems.judge_harnesses)
//
// 対応言語は CONTRACT §1 の python / rust / typescript / java。
import type { ParamType, ReturnType, Signature } from './signature.js';
import { toSnakeCase } from './signature.js';

export type Language = 'python' | 'rust' | 'typescript' | 'java';
export const LANGUAGES: Language[] = ['python', 'rust', 'typescript', 'java'];

export interface CodegenResult {
  templates: Record<Language, string>;
  harnesses: Record<Language, string>;
}

export function generateCode(sig: Signature): CodegenResult {
  return {
    templates: {
      python: pythonTemplate(sig),
      rust: rustTemplate(sig),
      typescript: typescriptTemplate(sig),
      java: javaTemplate(sig),
    },
    harnesses: {
      python: pythonHarness(sig),
      rust: rustHarness(sig),
      typescript: typescriptHarness(sig),
      java: javaHarness(sig),
    },
  };
}

// ---------------------------------------------------------------- Python

const PY_TYPES: Record<ParamType | ReturnType, string> = {
  int: 'int',
  str: 'str',
  bool: 'bool',
  'int[]': 'List[int]',
  'str[]': 'List[str]',
  'int[][]': 'List[List[int]]',
};

function usesList(sig: Signature): boolean {
  return sig.params.some((p) => p.type.includes('[')) || sig.returns.includes('[');
}

function pythonTemplate(sig: Signature): string {
  const params = sig.params.map((p) => `${p.name}: ${PY_TYPES[p.type]}`).join(', ');
  const imports = usesList(sig) ? 'from typing import List\n\n\n' : '';
  return `${imports}class Solution:
    def ${sig.function_name}(self, ${params}) -> ${PY_TYPES[sig.returns]}:
        # ここに解答を書く
        pass
`;
}

function pythonParse(type: ParamType, name: string): string[] {
  switch (type) {
    case 'int':
      return [`${name} = int(_lines[_i]); _i += 1`];
    case 'str':
      return [`${name} = _lines[_i]; _i += 1`];
    case 'bool':
      return [`${name} = _lines[_i].strip() == "true"; _i += 1`];
    case 'int[]':
      return [
        `_i += 1  # 要素数行は読み飛ばす`,
        `${name} = [int(v) for v in _lines[_i].split()]; _i += 1`,
      ];
    case 'str[]':
      return [
        `_n = int(_lines[_i]); _i += 1`,
        `${name} = _lines[_i:_i + _n]; _i += _n`,
      ];
    case 'int[][]':
      return [
        `_r = int(_lines[_i]); _i += 1`,
        `${name} = []`,
        `for _ in range(_r):`,
        `    _parts = _lines[_i].split(); _i += 1`,
        `    ${name}.append([int(v) for v in _parts[1:1 + int(_parts[0])]])`,
      ];
  }
}

function pythonPrint(type: ReturnType): string {
  switch (type) {
    case 'int':
    case 'str':
      return 'print(_res)';
    case 'bool':
      return 'print("true" if _res else "false")';
    case 'int[]':
      return 'print(" ".join(str(v) for v in _res))';
    case 'str[]':
      return 'print("\\n".join(_res))';
  }
}

function pythonHarness(sig: Signature): string {
  const parse = sig.params
    .flatMap((p) => pythonParse(p.type, p.name))
    .map((line) => `    ${line}`)
    .join('\n');
  const args = sig.params.map((p) => p.name).join(', ');
  return `

# --- RaidCoder judge harness (auto-generated) ---
import sys


def _rc_main():
    _lines = sys.stdin.read().split("\\n")
    _i = 0
${parse}
    _res = Solution().${sig.function_name}(${args})
    ${pythonPrint(sig.returns)}


_rc_main()
`;
}

// ---------------------------------------------------------------- Rust

const RUST_TYPES: Record<ParamType | ReturnType, string> = {
  int: 'i64',
  str: 'String',
  bool: 'bool',
  'int[]': 'Vec<i64>',
  'str[]': 'Vec<String>',
  'int[][]': 'Vec<Vec<i64>>',
};

const RUST_DEFAULTS: Record<ReturnType, string> = {
  int: '0',
  str: 'String::new()',
  bool: 'false',
  'int[]': 'vec![]',
  'str[]': 'vec![]',
};

function rustTemplate(sig: Signature): string {
  const fn = toSnakeCase(sig.function_name);
  const params = sig.params.map((p) => `${toSnakeCase(p.name)}: ${RUST_TYPES[p.type]}`).join(', ');
  return `impl Solution {
    pub fn ${fn}(${params}) -> ${RUST_TYPES[sig.returns]} {
        // ここに解答を書く
        ${RUST_DEFAULTS[sig.returns]}
    }
}
`;
}

function rustParse(type: ParamType, name: string): string[] {
  switch (type) {
    case 'int':
      return [`let ${name}: i64 = _it.next().unwrap().trim().parse().unwrap();`];
    case 'str':
      return [`let ${name}: String = _it.next().unwrap().to_string();`];
    case 'bool':
      return [`let ${name}: bool = _it.next().unwrap().trim() == "true";`];
    case 'int[]':
      return [
        `let _ = _it.next();`,
        `let ${name}: Vec<i64> = _it.next().unwrap().split_whitespace().map(|v| v.parse().unwrap()).collect();`,
      ];
    case 'str[]':
      return [
        `let _n: usize = _it.next().unwrap().trim().parse().unwrap();`,
        `let ${name}: Vec<String> = (0.._n).map(|_| _it.next().unwrap().to_string()).collect();`,
      ];
    case 'int[][]':
      return [
        `let _r: usize = _it.next().unwrap().trim().parse().unwrap();`,
        `let ${name}: Vec<Vec<i64>> = (0.._r).map(|_| {`,
        `    let mut _w = _it.next().unwrap().split_whitespace().map(|v| v.parse::<i64>().unwrap());`,
        `    let _m = _w.next().unwrap() as usize;`,
        `    _w.take(_m).collect()`,
        `}).collect();`,
      ];
  }
}

function rustPrint(type: ReturnType): string {
  switch (type) {
    case 'int':
    case 'str':
      return 'println!("{}", _res);';
    case 'bool':
      return 'println!("{}", if _res { "true" } else { "false" });';
    case 'int[]':
      return 'println!("{}", _res.iter().map(|v| v.to_string()).collect::<Vec<_>>().join(" "));';
    case 'str[]':
      return 'println!("{}", _res.join("\\n"));';
  }
}

function rustHarness(sig: Signature): string {
  const fn = toSnakeCase(sig.function_name);
  const parse = sig.params
    .flatMap((p) => rustParse(p.type, toSnakeCase(p.name)))
    .map((line) => `    ${line}`)
    .join('\n');
  const args = sig.params.map((p) => toSnakeCase(p.name)).join(', ');
  return `

// --- RaidCoder judge harness (auto-generated) ---
struct Solution;

fn main() {
    use std::io::Read;
    let mut _s = String::new();
    std::io::stdin().read_to_string(&mut _s).unwrap();
    let mut _it = _s.lines();
${parse}
    let _res = Solution::${fn}(${args});
    ${rustPrint(sig.returns)}
}
`;
}

// ---------------------------------------------------------------- TypeScript

const TS_TYPES: Record<ParamType | ReturnType, string> = {
  int: 'number',
  str: 'string',
  bool: 'boolean',
  'int[]': 'number[]',
  'str[]': 'string[]',
  'int[][]': 'number[][]',
};

const TS_DEFAULTS: Record<ReturnType, string> = {
  int: '0',
  str: '""',
  bool: 'false',
  'int[]': '[]',
  'str[]': '[]',
};

function typescriptTemplate(sig: Signature): string {
  const params = sig.params.map((p) => `${p.name}: ${TS_TYPES[p.type]}`).join(', ');
  return `function ${sig.function_name}(${params}): ${TS_TYPES[sig.returns]} {
    // ここに解答を書く
    return ${TS_DEFAULTS[sig.returns]};
}
`;
}

function tsParse(type: ParamType, name: string): string[] {
  switch (type) {
    case 'int':
      return [`const ${name}: number = parseInt(_rcLines[_rcI++], 10);`];
    case 'str':
      return [`const ${name}: string = _rcLines[_rcI++];`];
    case 'bool':
      return [`const ${name}: boolean = _rcLines[_rcI++].trim() === "true";`];
    case 'int[]':
      return [
        `_rcI++;`,
        `const ${name}: number[] = _rcLines[_rcI++].split(/\\s+/).filter(function (s) { return s.length > 0; }).map(Number);`,
      ];
    case 'str[]':
      return [
        `const _n_${name}: number = parseInt(_rcLines[_rcI++], 10);`,
        `const ${name}: string[] = _rcLines.slice(_rcI, _rcI + _n_${name}); _rcI += _n_${name};`,
      ];
    case 'int[][]':
      return [
        `const _r_${name}: number = parseInt(_rcLines[_rcI++], 10);`,
        `const ${name}: number[][] = [];`,
        `for (let _i = 0; _i < _r_${name}; _i++) {`,
        `    const _w = _rcLines[_rcI++].split(/\\s+/).filter(function (s) { return s.length > 0; }).map(Number);`,
        `    ${name}.push(_w.slice(1, 1 + _w[0]));`,
        `}`,
      ];
  }
}

function tsPrint(type: ReturnType): string {
  switch (type) {
    case 'int':
    case 'str':
      return 'console.log(String(_res));';
    case 'bool':
      return 'console.log(_res ? "true" : "false");';
    case 'int[]':
      return 'console.log(_res.join(" "));';
    case 'str[]':
      return 'console.log(_res.join("\\n"));';
  }
}

function typescriptHarness(sig: Signature): string {
  const parse = sig.params.flatMap((p) => tsParse(p.type, p.name)).join('\n');
  const args = sig.params.map((p) => p.name).join(', ');
  return `

// --- RaidCoder judge harness (auto-generated) ---
// 本番ジャッジ(素の tsc)には @types/node が無いため require を自前で宣言する
declare function require(name: string): any;
const _rcLines: string[] = require("fs").readFileSync("/dev/stdin", "utf8").split("\\n");
let _rcI = 0;
${parse}
const _res = ${sig.function_name}(${args});
${tsPrint(sig.returns)}
`;
}

// ---------------------------------------------------------------- Java

const JAVA_TYPES: Record<ParamType | ReturnType, string> = {
  int: 'long',
  str: 'String',
  bool: 'boolean',
  'int[]': 'long[]',
  'str[]': 'String[]',
  'int[][]': 'long[][]',
};

const JAVA_DEFAULTS: Record<ReturnType, string> = {
  int: '0',
  str: '""',
  bool: 'false',
  'int[]': 'new long[0]',
  'str[]': 'new String[0]',
};

function javaTemplate(sig: Signature): string {
  const params = sig.params.map((p) => `${JAVA_TYPES[p.type]} ${p.name}`).join(', ');
  return `class Solution {
    public ${JAVA_TYPES[sig.returns]} ${sig.function_name}(${params}) {
        // ここに解答を書く
        return ${JAVA_DEFAULTS[sig.returns]};
    }
}
`;
}

function javaParse(type: ParamType, name: string, idx: number): string[] {
  switch (type) {
    case 'int':
      return [`long ${name} = Long.parseLong(_br.readLine().trim());`];
    case 'str':
      return [`String ${name} = _br.readLine();`];
    case 'bool':
      return [`boolean ${name} = _br.readLine().trim().equals("true");`];
    case 'int[]':
      return [
        `int _n${idx} = Integer.parseInt(_br.readLine().trim());`,
        `long[] ${name} = new long[_n${idx}];`,
        `java.util.StringTokenizer _st${idx} = new java.util.StringTokenizer(_br.readLine());`,
        `for (int _i = 0; _i < _n${idx}; _i++) ${name}[_i] = Long.parseLong(_st${idx}.nextToken());`,
      ];
    case 'str[]':
      return [
        `int _n${idx} = Integer.parseInt(_br.readLine().trim());`,
        `String[] ${name} = new String[_n${idx}];`,
        `for (int _i = 0; _i < _n${idx}; _i++) ${name}[_i] = _br.readLine();`,
      ];
    case 'int[][]':
      return [
        `int _r${idx} = Integer.parseInt(_br.readLine().trim());`,
        `long[][] ${name} = new long[_r${idx}][];`,
        `for (int _i = 0; _i < _r${idx}; _i++) {`,
        `    java.util.StringTokenizer _st${idx} = new java.util.StringTokenizer(_br.readLine());`,
        `    int _m = Integer.parseInt(_st${idx}.nextToken());`,
        `    ${name}[_i] = new long[_m];`,
        `    for (int _j = 0; _j < _m; _j++) ${name}[_i][_j] = Long.parseLong(_st${idx}.nextToken());`,
        `}`,
      ];
  }
}

function javaPrint(type: ReturnType): string[] {
  switch (type) {
    case 'int':
      return ['System.out.println(_res);'];
    case 'str':
      return ['System.out.println(_res);'];
    case 'bool':
      return ['System.out.println(_res ? "true" : "false");'];
    case 'int[]': {
      return [
        'StringBuilder _sb = new StringBuilder();',
        'for (int _i = 0; _i < _res.length; _i++) { if (_i > 0) _sb.append(\' \'); _sb.append(_res[_i]); }',
        'System.out.println(_sb);',
      ];
    }
    case 'str[]': {
      return [
        'StringBuilder _sb = new StringBuilder();',
        'for (int _i = 0; _i < _res.length; _i++) { if (_i > 0) _sb.append(\'\\n\'); _sb.append(_res[_i]); }',
        'System.out.println(_sb);',
      ];
    }
  }
}

function javaHarness(sig: Signature): string {
  const parse = sig.params
    .flatMap((p, idx) => javaParse(p.type, p.name, idx))
    .map((line) => `        ${line}`)
    .join('\n');
  const args = sig.params.map((p) => p.name).join(', ');
  const print = javaPrint(sig.returns)
    .map((line) => `        ${line}`)
    .join('\n');
  return `

// --- RaidCoder judge harness (auto-generated) ---
public class Main {
    public static void main(String[] _args) throws Exception {
        java.io.BufferedReader _br = new java.io.BufferedReader(new java.io.InputStreamReader(System.in));
${parse}
        ${JAVA_TYPES[sig.returns]} _res = new Solution().${sig.function_name}(${args});
${print}
    }
}
`;
}
