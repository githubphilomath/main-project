/**
 * Output Viewer Component
 * Center panel displaying generated project files
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { FileTree } from './FileTree';
import { CodeViewer } from './CodeViewer';
import { useStore } from '@/store/useStore';
import { Download, FileCode, FileText, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const OutputViewer: React.FC = () => {
  const { workflowState, projectStatus } = useStore();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const codeArtifacts = workflowState?.code_artifacts || [];
  const testArtifacts = workflowState?.test_artifacts || [];
  const docArtifacts = workflowState?.documentation_artifacts || [];

  const allFiles = [
    ...codeArtifacts.map((f) => ({ ...f, type: 'code' as const })),
    ...testArtifacts.map((f) => ({ ...f, type: 'test' as const })),
    ...docArtifacts.map((f) => ({
      ...f,
      file_path: f.doc_type ? `docs/${f.doc_type}` : (f as any).file_path || 'docs/unknown',
      type: 'doc' as const,
    })),
  ];

  const selectedFileData = allFiles.find((f) => f.file_path === selectedFile);

  const handleDownload = () => {
    if (!selectedFileData) return;

    const blob = new Blob([selectedFileData.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFileData.file_path.split('/').pop() || 'file';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!projectStatus || projectStatus.status === 'pending') {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent>
          <div className="text-center text-muted-foreground">
            <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No project output yet</p>
            <p className="text-sm mt-2">Start a project to see generated files here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Stats row - never shrinks */}
      <div className="flex-shrink-0 grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="!p-3">
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-lg font-bold leading-tight">{projectStatus.artifacts_count.code}</p>
                <p className="text-xs text-muted-foreground">Code Files</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="!p-3">
            <div className="flex items-center gap-2">
              <TestTube className="h-4 w-4 text-green-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-lg font-bold leading-tight">{projectStatus.artifacts_count.tests}</p>
                <p className="text-xs text-muted-foreground">Test Files</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="!p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-lg font-bold leading-tight">{projectStatus.artifacts_count.documentation}</p>
                <p className="text-xs text-muted-foreground">Docs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* File Tree + Code Viewer - fills the rest */}
      <div className="flex-1 min-h-0 flex gap-3">
        {/* File tree sidebar */}
        <Card className="w-[220px] flex-shrink-0 flex flex-col overflow-hidden">
          <CardHeader className="!p-3 flex-shrink-0">
            <CardTitle className="!text-sm">Files</CardTitle>
          </CardHeader>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <FileTree
              files={allFiles}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
            />
          </div>
        </Card>

        {/* Code viewer */}
        <Card className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {selectedFileData ? (
            <>
              <CardHeader className="!p-3 flex-shrink-0 flex flex-row items-center justify-between gap-2">
                <CardTitle className="!text-sm truncate">{selectedFileData.file_path}</CardTitle>
                <Button size="sm" variant="outline" onClick={handleDownload} className="flex-shrink-0">
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              </CardHeader>
              <div className="flex-1 min-h-0 overflow-hidden">
                <CodeViewer file={selectedFileData} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a file to view</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
