import { formatBytes } from '../engine/previewEngine';
import type { PageSize } from '../engine/types';

interface Props {
  pageCount: number;
  pageSizes: PageSize[];
  originalSize: number;
  fileName: string;
  entering: boolean;
  onEnterPreview: () => void;
  onBack: () => void;
}

export default function AnalysisPanel({
  pageCount,
  pageSizes,
  originalSize,
  fileName,
  entering,
  onEnterPreview,
  onBack,
}: Props) {
  const first = pageSizes[0];
  const sizeLabel = first
    ? `${Math.round(first.widthPt)} × ${Math.round(first.heightPt)} pt`
    : '—';

  return (
    <div className="panel analysis">
      <div className="panel__header">
        <button className="btn btn--ghost" onClick={onBack}>
          ← 重新选择
        </button>
        <h2>PDF 分析完成</h2>
      </div>

      <div className="analysis__file">
        <div className="file-badge">📄</div>
        <div>
          <div className="file-name">{fileName}</div>
          <div className="muted">{formatBytes(originalSize)}</div>
        </div>
      </div>

      <div className="stat-grid">
        <Stat label="页面" value={String(pageCount)} />
        <Stat label="页面尺寸" value={sizeLabel} />
        <Stat label="原始大小" value={formatBytes(originalSize)} />
        <Stat label="压缩方式" value="整页 JPEG" />
      </div>

      <div className="warn">
        每页将作为<b>一整张图片</b>进行压缩（整页栅格化）：预览第一页，选定质量后全部页面套用同一策略。
        输出 PDF 的文字不可搜索/复制。
      </div>

      <div className="panel__actions">
        <button className="btn btn--primary btn--lg" onClick={onEnterPreview} disabled={entering}>
          {entering ? '正在渲染预览…' : '进入四联预览'}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="stat__label">{label}</div>
      <div className="stat__value">{value}</div>
    </div>
  );
}
