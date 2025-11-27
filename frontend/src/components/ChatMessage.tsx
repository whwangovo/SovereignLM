import React from 'react';

interface Source {
  source: string;
  page?: string | number;
  text?: string;
}

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

const bracketRegex = /\[([^\]]+)\]/g;

const renderTextWithBold = (text: string) => {
  const parts = text.split(/\*\*(.*?)\*\*/);
  return parts.map((part, idx) =>
    idx % 2 === 1 ? (
      <strong key={`b-${idx}`} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    ),
  );
};

const CitationChip: React.FC<{ file: string; page?: string | number }> = ({ file, page }) => {
  const title = page ? `${String(file).trim()} · Page ${String(page).trim()}` : String(file).trim();
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-primary/40 bg-primary/10 text-xs text-primary align-middle"
      title={title}
    >
      <span aria-hidden="true">🔖</span>
    </span>
  );
};

const parseCitationEntry = (entry: string) => {
  // Parse single entry like "来源: A.pdf, Page 3" or "A.pdf, Page 3" or "arXiv:1234"
  const cleaned = entry.trim();
  if (!cleaned) return null;

  // Strip leading "来源:" or "source:"
  const stripped = cleaned.replace(/^(?:来源|source)\s*[:：]\s*/i, '');
  const match = stripped.match(/(.+?)(?:\s*,\s*(?:page|页)\s*[:：]?\s*(.+))?$/i);
  if (!match) return null;
  const file = match[1]?.trim();
  const page = match[2]?.trim();
  if (!file) return null;
  return { file, page };
};

const renderContent = (content: string) => {
  bracketRegex.lastIndex = 0; // reset global regex state
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  while (true) {
    const localMatch = bracketRegex.exec(content);
    if (!localMatch) break;
    const [full, inner] = localMatch;
    if (!full || !inner) continue;
    const hasSource = /(来源|source)/i.test(inner);
    if (!hasSource) continue;

    if (localMatch.index > lastIndex) {
      const textChunk = content.slice(lastIndex, localMatch.index);
      nodes.push(
        ...renderTextWithBold(textChunk).map((frag, idx) => (
          <React.Fragment key={`t-${lastIndex}-${idx}`}>{frag}</React.Fragment>
        )),
      );
    }

    const entries = inner.split(';').map((e) => e.trim()).filter(Boolean);
    entries.forEach((entry, idxEntry) => {
      const parsed = parseCitationEntry(entry);
      if (parsed) {
        nodes.push(<CitationChip key={`c-${localMatch.index}-${idxEntry}`} file={parsed.file} page={parsed.page} />);
      }
    });

    lastIndex = localMatch.index + full.length;
  }

  if (lastIndex < content.length) {
    const textChunk = content.slice(lastIndex);
    nodes.push(
      ...renderTextWithBold(textChunk).map((frag, idx) => (
        <React.Fragment key={`t-end-${idx}`}>{frag}</React.Fragment>
      )),
    );
  }

  // Handle line breaks
  const withBreaks: React.ReactNode[] = [];
  nodes.forEach((node, idx) => {
    if (typeof node === 'string') {
      const pieces = node.split('\n');
      pieces.forEach((p, i) => {
        withBreaks.push(p);
        if (i !== pieces.length - 1) withBreaks.push(<br key={`br-${idx}-${i}`} />);
      });
    } else {
      withBreaks.push(node);
    }
  });

  return withBreaks;
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, sources = [] }) => {
  const isUser = role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg">
          📓
        </div>
      )}

      <div
        className={`max-w-3xl rounded-2xl border ${
          isUser
            ? 'bg-primary text-white border-primary'
            : 'bg-white border-gray-200 text-gray-900'
        } p-4 shadow-lg`}
      >
      <div
        className={`text-sm leading-relaxed whitespace-pre-wrap max-w-none ${isUser ? 'prose-invert' : ''}`}
      >
        {renderContent(content || '')}
      </div>

        {!isUser && sources.length > 0 && (
          <div className="mt-3 space-y-2">
            {sources.map((src, idx) => (
              <div
                key={`${src.source}-${src.page}-${idx}`}
                className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-700"
              >
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <span>{src.source}</span>
                  {src.page !== undefined && <span className="text-gray-500">P.{src.page}</span>}
                </div>
                {src.text && (
                  <div className="text-gray-500 mt-1 leading-snug max-h-20 overflow-hidden">{src.text}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
          你
        </div>
      )}
    </div>
  );
};
