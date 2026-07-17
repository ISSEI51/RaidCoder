import type { SubmissionLanguage } from "@/lib/database.types";

// 対応言語(CONTRACT.md §1)。value は submissions.language の値そのもの。
export const LANGUAGES: { value: SubmissionLanguage; label: string }[] = [
  { value: "python", label: "Python 3.8" },
  { value: "rust", label: "Rust 1.40" },
  { value: "typescript", label: "TypeScript 3.7" },
  { value: "java", label: "Java (OpenJDK 13)" },
];

export function languageLabel(value: string): string {
  return LANGUAGES.find((l) => l.value === value)?.label ?? value;
}

// エディタ初期表示のテンプレート(stdin → stdout 形式)
export const CODE_TEMPLATES: Record<SubmissionLanguage, string> = {
  python: `import sys

def main():
    data = sys.stdin.read().split()
    # ここに解答を書く

main()
`,
  rust: `use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    // ここに解答を書く
}
`,
  typescript: `// 本番ジャッジ(素の tsc)には @types/node が無いため require を自前で宣言する
declare function require(name: string): any;

const input: string = require("fs").readFileSync("/dev/stdin", "utf8");
// ここに解答を書く
`,
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // ここに解答を書く
    }
}
`,
};
