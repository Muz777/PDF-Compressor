import { useRef, useState } from 'react';

interface Props {
  onFile: (file: File) => void;
}

export default function DropZone({ onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const pick = (files: FileList | null) => {
    const file = files && files[0];
    if (file && file.type === 'application/pdf') onFile(file);
    else if (file) alert('请选择 PDF 文件。');
  };

  return (
    <div
      className={`dropzone ${over ? 'dropzone--over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        pick(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(e) => pick(e.target.files)}
      />
      <div className="dropzone__icon">PDF</div>
      <h2>拖入 PDF，或点击选择文件</h2>
      <p className="muted">图片对象级压缩 · 保留文字/矢量层 · 四联预览 · 目标 ≤ 15 MB</p>
      <button className="btn btn--primary">选择 PDF</button>
    </div>
  );
}
