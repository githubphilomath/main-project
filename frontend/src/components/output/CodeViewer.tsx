/**
 * Code Viewer Component
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { FileCode } from 'lucide-react';
// Highlight.js styles loaded via CDN or custom CSS

interface CodeViewerProps {
  file: {
    file_path: string;
    content: string;
    type: 'code' | 'test' | 'doc';
    language?: string;
  };
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ file }) => {
  const isMarkdown = file.type === 'doc' || file.file_path.endsWith('.md');
  const language = file.language || file.file_path.split('.').pop() || 'text';

  if (isMarkdown) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{file.content}</ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <pre className="h-full m-0 p-4 bg-[#0d1117] text-sm">
        <code className={`language-${language}`}>{file.content}</code>
      </pre>
    </div>
  );
};

