/**
 * Code Viewer Component - supports Code and Doc views
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

export type ViewMode = 'code' | 'doc' | 'app';

interface CodeViewerProps {
  file: {
    file_path: string;
    content: string;
    type: 'code' | 'test' | 'doc';
    language?: string;
  };
  mode: ViewMode;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ file, mode }) => {
  const isDocType = file.type === 'doc' || file.file_path.endsWith('.md');

  if (mode === 'doc') {
    if (isDocType) {
      return (
        <div className="h-full overflow-auto p-6 bg-background">
          <div className="prose prose-sm dark:prose-invert max-w-none
            prose-headings:font-semibold prose-headings:tracking-tight
            prose-h1:text-2xl prose-h1:border-b prose-h1:pb-2 prose-h1:mb-4
            prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3
            prose-h3:text-lg prose-h3:mt-4
            prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs
            prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-[#0d1117] prose-pre:text-[#c9d1d9] prose-pre:rounded-lg prose-pre:border prose-pre:border-border
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-strong:text-foreground
            prose-li:marker:text-muted-foreground
            prose-table:text-sm prose-th:bg-muted/50
          ">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {file.content}
            </ReactMarkdown>
          </div>
        </div>
      );
    }
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Select a .md or doc file to see rendered documentation
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
