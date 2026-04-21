"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeBlockProps {
  language: string;
  value: string;
}

export default function CodeBlock({ language, value }: CodeBlockProps) {
  return (
    <SyntaxHighlighter
      language={language}
      style={tomorrow}
      customStyle={{
        borderRadius: "12px",
        padding: "18px",
        fontSize: "14px",
        lineHeight: "1.6",
      }}
    >
      {value}
    </SyntaxHighlighter>
  );
}

