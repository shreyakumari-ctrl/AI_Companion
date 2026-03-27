"use client";

import React, { useState } from "react";
import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/prism";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeBlockProps {
  language: string;
  children: string;
}

const CodeBlock = ({ language, children }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <span className="code-lang">{language || "text"}</span>
        <button className="copy-code-btn" onClick={handleCopy}>
          {copied ? "Copied ✅" : "📋 Copy Code"}
        </button>
      </div>
      <SyntaxHighlighter language={language || "text"} style={oneDark} customStyle={{ margin: 0, borderRadius: "0 0 8px 8px" }}>
        {children}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodeBlock;
