import { Activity, Loader2 } from 'lucide-react';
import React from 'react';

interface StatusBoardProps {
  logs: string[];
  isRunning: boolean;
}

export const StatusBoard: React.FC<StatusBoardProps> = ({ logs, isRunning }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-lg h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-800">
          <Activity className="w-4 h-4 text-primary" />
          <span>思考进度</span>
        </div>
        {isRunning && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <div className="text-xs text-gray-500">等待新的提问...</div>
        ) : (
          logs.map((log, idx) => (
            <div key={`${idx}-${log.slice(0, 10)}`} className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
              <p className="text-sm text-gray-700 leading-snug">{log}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
