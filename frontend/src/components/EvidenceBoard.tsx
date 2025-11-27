import React from 'react';
import { FileText } from 'lucide-react';
import { motion } from 'framer-motion';

interface Evidence {
  source: string;
  page: string | number;
  text: string;
}

interface EvidenceBoardProps {
  evidence: Evidence[];
}

export const EvidenceBoard: React.FC<EvidenceBoardProps> = ({ evidence }) => {
  if (evidence.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
        Evidence Board
      </h3>
      <div className="grid gap-4">
        {evidence.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-surface border-l-4 border-secondary p-4 rounded-r-lg shadow-md hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-white">{item.source}</span>
              <span className="text-xs text-gray-500 bg-gray-900 px-2 py-0.5 rounded">
                Page {item.page}
              </span>
            </div>
            <p className="text-sm text-gray-300 line-clamp-3">
              {item.text}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
