import { useRef, useState } from 'react';

interface UploadPanelProps {
  onUploaded?: () => void;
}

export const UploadPanel: React.FC<UploadPanelProps> = ({ onUploaded }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('reindex', 'true');

    setIsUploading(true);
    setMessage('正在上传并重新索引...');
    try {
      const res = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || '上传失败');
      }
      setMessage('上传成功，索引已更新 ✅');
      onUploaded?.();
    } catch (e) {
      setMessage(`上传失败: ${e}`);
    } finally {
      setIsUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
      // reset input to allow re-select same file
      e.target.value = '';
    }
  };

  const triggerPick = () => inputRef.current?.click();

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-800">上传文件并重建索引</div>
        {isUploading && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
      </div>
      <p className="text-xs text-gray-500">上传 PDF 到本地库，完成后自动触发 re-index。</p>
      <div className="flex items-center gap-3">
        <button
          onClick={triggerPick}
          disabled={isUploading}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:brightness-105 transition disabled:opacity-60"
        >
          选择文件
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={onFileChange}
        />
        {message && <span className="text-xs text-gray-600">{message}</span>}
      </div>
    </div>
  );
};
