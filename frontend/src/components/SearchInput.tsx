import React, { useState } from 'react';

interface SearchInputProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
      setQuery('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-gray-200 rounded-2xl p-4 shadow-lg"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">问问你的本地文档...</span>
        {isLoading && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
      </div>
      <div className="relative">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="例如：请总结这批论文对 Memory 模块的不同观点，并列出引用。"
          rows={3}
          className="w-full bg-white border border-gray-300 text-gray-800 rounded-xl py-3 px-4 
                     focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 
                     transition-all resize-none placeholder:text-gray-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="absolute bottom-3 right-3 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold
                     hover:brightness-105 transition shadow-md shadow-blue-500/20 disabled:opacity-60"
        >
          发送
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-2">Shift + Enter 换行，Enter 发送</p>
    </form>
  );
};
