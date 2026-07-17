import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// 問題文・解説・掲示板投稿の Markdown 表示(KaTeX 数式対応)
// katex の CSS は app/layout.tsx で npm パッケージから import している。
// 見た目は globals.css の .markdown-body が正(色はデザイントークン経由)。
export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown-body text-sm text-foreground [&>:first-child]:mt-0 [&>:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
