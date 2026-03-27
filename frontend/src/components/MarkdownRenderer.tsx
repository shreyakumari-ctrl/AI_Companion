import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import type { Components } from "react-markdown";
import CodeBlock from "./CodeBlock";

interface Props {
  content: string;
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
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
