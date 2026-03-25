"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/prism";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useState } from "react";
import type { Components } from "react-markdown";
import type { Element } from "hast";

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
      // In react-markdown v10, check parent node to determine if block code
      const parent = (node as Element & { parent?: Element })?.parent;
      const isBlock = parent?.type === "element" && parent?.tagName === "pre";

      if (isBlock && match) {
        return (
          <CodeBlock language={match[1]}>
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
