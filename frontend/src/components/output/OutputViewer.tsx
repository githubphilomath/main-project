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
    ...docArtifacts.map((f) => ({ ...f, type: 'doc' as const })),
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
    <div className="h-full flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileCode className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{projectStatus.artifacts_count.code}</p>
                <p className="text-xs text-muted-foreground">Code Files</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{projectStatus.artifacts_count.tests}</p>
                <p className="text-xs text-muted-foreground">Test Files</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{projectStatus.artifacts_count.documentation}</p>
                <p className="text-xs text-muted-foreground">Docs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* File Tree and Viewer */}
      <div className="flex-1 grid grid-cols-[300px_1fr] gap-4 min-h-0">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Files</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <FileTree
              files={allFiles}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
            />
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          {selectedFileData ? (
            <>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">{selectedFileData.file_path}</CardTitle>
                <Button size="sm" variant="outline" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <CodeViewer file={selectedFileData} />
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a file to view</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

