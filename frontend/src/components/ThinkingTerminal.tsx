import React, { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';
import { motion } from 'framer-motion';

interface ThinkingTerminalProps {
  logs: string;
}

export const ThinkingTerminal: React.FC<ThinkingTerminalProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-surface border border-gray-800 rounded-xl overflow-hidden shadow-2xl h-[600px] flex flex-col"
    >
      <div className="bg-gray-900/50 px-4 py-3 border-b border-gray-800 flex items-center gap-2">
        <Terminal className="w-4 h-4 text-accent" />
        <span className="text-xs font-mono text-gray-400">NEURAL_STREAM_V2.0</span>
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 p-4 font-mono text-sm text-accent overflow-y-auto whitespace-pre-wrap"
      >
        {logs}
        <span className="animate-pulse">_</span>
      </div>
    </motion.div>
  );
};
