"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/prism";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useState } from "react";
import type { Components } from "react-markdown";

interface Props {
  content: string;
}

function CodeBlock({
  language,
  children,
}: {
  language: string;
  children: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={handleCopy}
        aria-label="Copy code"
        style={{
          position: "absolute",
          top: "0.5rem",
          right: "0.5rem",
          zIndex: 1,
          padding: "0.25rem 0.5rem",
          fontSize: "0.75rem",
          cursor: "pointer",
        }}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
      <SyntaxHighlighter language={language || "text"} style={oneDark}>
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

export default function MarkdownRenderer({ content }: Props) {
  const components: Components = {
    code({ node, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      // Block code always has a language class from the fenced block syntax.
      // Inline code never has one. This is the reliable detection in react-markdown v10.
      const isBlock = Boolean(match);

      if (isBlock) {
        return (
          <CodeBlock language={match![1]}>
            {String(children).replace(/\n$/, "")}
          </CodeBlock>
        );
      }

      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    // Unwrap the <pre> wrapper since CodeBlock renders its own container
    pre({ children }) {
      return <>{children}</>;
    },
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
}
