import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// 問題文・解説・掲示板投稿の Markdown 表示(KaTeX 数式対応)
// katex の CSS は app/layout.tsx で npm パッケージから import している
export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown-body text-sm text-slate-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
