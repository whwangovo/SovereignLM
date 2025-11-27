import { BookOpen, FolderOpenDot, HardDrive, RefreshCw } from 'lucide-react';
import React from 'react';

interface SidebarProps {
  documents: string[];
  onReindex: () => void;
  isIndexing: boolean;
  docPath: string;
  onUploadClick: () => void;
  uploadMessage?: string;
  isUploading?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  documents,
  onReindex,
  isIndexing,
  docPath,
  onUploadClick,
  uploadMessage,
  isUploading,
}) => {
  return (
    <aside className="w-72 bg-white/95 backdrop-blur border-r border-gray-200 text-gray-900 fixed inset-y-0 left-0 px-6 py-8 flex flex-col gap-6 shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase text-gray-500 tracking-[0.2em]">NotebookLM</p>
          <h1 className="text-xl font-semibold text-gray-900">Local Library</h1>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <HardDrive className="w-3 h-3" /> {docPath}
          </p>
        </div>
        <span className="text-lg">📓</span>
      </div>

      <button
        onClick={onReindex}
        disabled={isIndexing}
        className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 
                   hover:brightness-105 text-white border border-primary/70 
                   py-3 px-4 font-medium transition disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
      >
        <RefreshCw className={`w-4 h-4 ${isIndexing ? 'animate-spin' : ''}`} />
        {isIndexing ? 'Re-indexing...' : 'Re-Index Library'}
      </button>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-md space-y-3">
        <div className="text-sm font-semibold text-gray-800">上传新文件</div>
        <button
          onClick={onUploadClick}
          disabled={isUploading}
          className="w-full px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:brightness-105 transition disabled:opacity-60"
        >
          {isUploading ? '上传中...' : '选择 PDF'}
        </button>
        {uploadMessage && <div className="text-xs text-gray-600">{uploadMessage}</div>}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-md">
        <div className="flex items-center gap-2 text-sm text-gray-700 mb-3">
          <FolderOpenDot className="w-4 h-4 text-primary" />
          <span className="font-semibold">文献清单</span>
        </div>
        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
          {documents.length === 0 ? (
            <div className="text-xs text-gray-500">尚未找到 PDF 文档，请将文件放入库目录。</div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc}
                className="flex items-start gap-2 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
              >
                <BookOpen className="w-4 h-4 text-primary mt-1" />
                <span className="leading-snug break-all">{doc}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-gray-200 text-xs text-gray-500">
        Core: Parallax Dist. v1.0
      </div>
    </aside>
  );
};
