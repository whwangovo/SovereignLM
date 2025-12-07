import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from './components/ChatMessage';
import { SearchInput } from './components/SearchInput';
import { Sidebar } from './components/Sidebar';
import { SourceShelf } from './components/SourceShelf';
import { StatusBoard } from './components/StatusBoard';

interface Source {
  source: string;
  page?: string | number;
  text?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

interface StreamEvent {
  type: 'status' | 'thought' | 'evidence';
  content?: string;
  docs?: string[];
  metas?: { source?: string; page?: string | number }[];
}

const DOC_DIR = './documents';

const mergeSources = (existing: Source[], incoming: Source[]): Source[] => {
  const seen = new Set<string>();
  const merged: Source[] = [];

  [...existing, ...incoming].forEach((src) => {
    const key = `${src.source}-${src.page}-${(src.text || '').slice(0, 32)}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(src);
    }
  });

  return merged;
};

function App() {
  const [documents, setDocuments] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [statusLog, setStatusLog] = useState<string[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (e) {
      setStatusLog((prev) => [...prev, '无法读取文档列表，请确认后端运行正常。']);
    }
  };

  const handleReindex = async () => {
    setIsIndexing(true);
    try {
      const res = await fetch('http://localhost:8000/api/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      setStatusLog((prev) => [...prev, res.ok ? '📚 索引更新完成' : '⚠️ 索引失败']);
      await fetchDocuments();
    } catch (e) {
      setStatusLog((prev) => [...prev, `索引失败: ${e}`]);
    } finally {
      setIsIndexing(false);
    }
  };

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('reindex', 'true');

    setIsUploading(true);
    setUploadMessage('正在上传并重建索引...');
    try {
      const res = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || '上传失败');
      }
      setUploadMessage('上传成功，索引已更新 ✅');
      await fetchDocuments();
    } catch (e) {
      setUploadMessage(`上传失败: ${e}`);
    } finally {
      setIsUploading(false);
    }
  };

  const onUploadClick = () => fileInputRef.current?.click();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
      e.target.value = '';
    }
  };

  const handleSearch = async (query: string) => {
    if (isLoading) return;

    const prevMessages = messages; // snapshot for history
    setMessages((prev) => [...prev, { role: 'user', content: query }]);
    // setStatusLog(['🧠 正在初始化思维链...']);
    setSources([]);
    setIsLoading(true);

    let liveSources: Source[] = [];
    let finalAnswer = '';
    let thoughtTrail = '';
    let thoughtStep = 1;
    let lastLog = '';
    const MAX_LOGS = 40;

    try {
      // 仅保留历史的用户 query 和助手最终回答，避免上下文膨胀
      const history = prevMessages.filter((m) => {
        if (m.role === 'user') return true;
        if (m.role === 'assistant') {
          // 简单判断：有 sources 或非空 content 即视作最终答复
          return Boolean(m.content);
        }
        return false;
      });

      const payload = { query, history };

      const response = await fetch('http://localhost:8000/api/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const normalizeLog = (entry: string) => {
        let out = entry.trim();
        // strip common markdown emphasis and inline code/latex markers
        out = out.replace(/\*\*(.*?)\*\*/g, '$1');
        out = out.replace(/`([^`]*)`/g, '$1');
        out = out.replace(/\$(.*?)\$/g, '$1');
        return out.trim();
      };

      const pushLog = (entry: string, dedupe = false) => {
        const trimmed = normalizeLog(entry);
        if (dedupe && lastLog === trimmed) return;
        lastLog = trimmed;
        setStatusLog((prev) => {
          const next = [...prev, trimmed];
          return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next;
        });
      };

      // Only render pure思考，不重复渲染 SEARCH（SEARCH 已由 status 事件提供）
      const recordThought = (content: string) => {
        const cleaned = content.replace(/Action:\s*\[SEARCH\][^\n]*/gi, '').trim();
        if (cleaned) {
          const sentence = cleaned.split(/(?<=[。.!?？])/)[0] || cleaned;
          const summary = sentence.length > 160 ? `${sentence.slice(0, 157)}...` : sentence;
          pushLog(`🧠 Step ${thoughtStep}: ${summary}`, true);
          thoughtStep += 1;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6);
          if (dataStr === '[DONE]') continue;

          const event: StreamEvent = JSON.parse(dataStr);

          if (event.type === 'status' && event.content) {
            pushLog(`${event.content}`);
          }

          if (event.type === 'evidence' && event.docs && event.metas) {
            const newSources = event.docs.map((doc, i) => ({
              source: event.metas?.[i]?.source ?? 'Unknown',
              page: event.metas?.[i]?.page ?? 'N/A',
              text: doc,
            }));
            liveSources = mergeSources(liveSources, newSources);
            setSources(liveSources);
          }

          if (event.type === 'thought' && event.content) {
            const content = event.content;
            if (content.includes('Final Answer:')) {
              const [thinking, answer] = content.split('Final Answer:');
              if (thinking.trim()) {
                thoughtTrail += thinking;
                recordThought(thinking);
              }
              finalAnswer = answer.trim();
            } else {
              thoughtTrail += content;
              recordThought(content);
            }
          }
        }
      }
    } catch (error) {
      setStatusLog((prev) => [...prev, `❌ 处理请求时出错: ${error}`]);
      if (!finalAnswer) {
        finalAnswer = '处理请求时出现问题，请稍后重试。';
      }
    } finally {
      setIsLoading(false);
    }

    const assistantMessage: Message = {
      role: 'assistant',
      content: finalAnswer || thoughtTrail || '暂未生成答案。',
      sources: liveSources,
    };
    setMessages((prev) => [...prev, assistantMessage]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fbff] via-[#f3f6fb] to-[#eef2f7] text-gray-900 font-sans">
      <Sidebar
        documents={documents}
        onReindex={handleReindex}
        isIndexing={isIndexing}
        docPath={DOC_DIR}
        onUploadClick={onUploadClick}
        uploadMessage={uploadMessage}
        isUploading={isUploading}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={onFileChange}
      />

      <main className="ml-72 p-10 h-screen overflow-hidden">
        <div className="max-w-6xl mx-auto h-full flex flex-col gap-6">
          <header className="flex items-start justify-between shrink-0">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Parallax Scholar</p>
              <h1 className="text-3xl font-semibold text-gray-900">SovereignLM</h1>
              <p className="text-sm text-gray-600">
                Privacy-first research assistant running on your heterogeneous hardware.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-gradient-to-r from-primary/15 to-primary/5 text-primary px-4 py-2 rounded-xl shadow-lg shadow-blue-500/10 border border-primary/20">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-semibold">⚡ Powered by Parallax, Mac M1 (16G) + WSL 4060Ti (8G)</span>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
            <section className="lg:col-span-2 bg-white border border-gray-200 rounded-3xl p-6 shadow-xl backdrop-blur flex flex-col gap-6 h-full min-h-0">
              <div className="flex-1 space-y-6 overflow-y-auto pr-1">
                {messages.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-gray-600 text-sm">
                    开始对话，SovereignLM 会结合你的 PDF 文档生成带引用的中文回答。
                  </div>
                ) : (
                  <AnimatePresence>
                    {messages.map((msg, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <ChatMessage role={msg.role} content={msg.content} sources={msg.sources} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>

              <div className="pt-2 border-t border-gray-800">
                <SearchInput onSearch={handleSearch} isLoading={isLoading} />
              </div>
            </section>

            <div className="h-full min-h-0 flex flex-col gap-4">
              <div className="flex-[0.55] min-h-0">
                <StatusBoard logs={statusLog} isRunning={isLoading} />
              </div>
              <div className="flex-[0.45] min-h-0 space-y-4 flex flex-col">
                <SourceShelf sources={sources} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
