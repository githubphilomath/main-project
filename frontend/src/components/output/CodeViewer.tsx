/**
 * Code Viewer Component
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
      <div className="h-full overflow-auto p-6">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{file.content}</ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-[#0d1117]">
      <pre className="m-0 p-4 text-sm leading-relaxed" style={{ background: 'transparent' }}>
        <code style={{ color: '#c9d1d9', fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace' }}>
          {file.content}
        </code>
      </pre>
    </div>
  );
};
