/**
 * File Tree Component
 */

import React from 'react';
import { FileCode, FileText, TestTube, Folder, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

interface FileItem {
  file_path: string;
  content: string;
  type: 'code' | 'test' | 'doc';
  language?: string;
}

interface FileTreeProps {
  files: FileItem[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  selectedFile,
  onSelectFile,
}) => {
  const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(new Set());

  const toggleFolder = (folder: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folder)) {
      newExpanded.delete(folder);
    } else {
      newExpanded.add(folder);
    }
    setExpandedFolders(newExpanded);
  };

  // Organize files by folder
  const folderStructure: Record<string, FileItem[]> = {};
  
  files.forEach((file) => {
    const parts = file.file_path.split('/');
    const folder = parts.slice(0, -1).join('/') || '/';
    if (!folderStructure[folder]) {
      folderStructure[folder] = [];
    }
    folderStructure[folder].push(file);
  });

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'code':
        return <FileCode className="h-4 w-4" />;
      case 'test':
        return <TestTube className="h-4 w-4" />;
      case 'doc':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileCode className="h-4 w-4" />;
    }
  };

  return (
    <div className="overflow-y-auto h-full p-2">
      {Object.entries(folderStructure).map(([folder, folderFiles]) => {
        const isExpanded = expandedFolders.has(folder);
        const folderName = folder === '/' ? 'Root' : folder.split('/').pop() || folder;

        return (
          <div key={folder} className="mb-1">
            <button
              onClick={() => toggleFolder(folder)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-sm font-medium"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Folder className="h-4 w-4 text-muted-foreground" />
              <span>{folderName}</span>
            </button>
            
            {isExpanded && (
              <div className="ml-6 space-y-0.5">
                {folderFiles.map((file) => {
                  const fileName = file.file_path.split('/').pop() || file.file_path;
                  const isSelected = selectedFile === file.file_path;

                  return (
                    <button
                      key={file.file_path}
                      onClick={() => onSelectFile(file.file_path)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {getFileIcon(file.type)}
                      <span className="truncate">{fileName}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

