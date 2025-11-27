import { BookOpenCheck } from 'lucide-react';
import React from 'react';

interface Source {
  source: string;
  page?: string | number;
  text?: string;
}

interface SourceShelfProps {
  sources: Source[];
}

export const SourceShelf: React.FC<SourceShelfProps> = ({ sources }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-lg h-full flex flex-col">
      <div className="flex items-center gap-2 text-sm text-gray-800 mb-3">
        <BookOpenCheck className="w-4 h-4 text-primary" />
        <span>Sources & Citations</span>
      </div>
      {sources.length === 0 ? (
        <div className="text-xs text-gray-500">回答里的引用会展示在这里。</div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {sources.map((src, idx) => (
            <div
              key={`${src.source}-${src.page}-${idx}`}
              className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-700"
            >
              <div className="flex items-center gap-2 text-primary font-semibold">
                <span>{src.source}</span>
                {src.page !== undefined && <span className="text-gray-500">P.{src.page}</span>}
              </div>
              {src.text && <div className="text-gray-500 mt-1 leading-snug max-h-20 overflow-hidden">{src.text}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
