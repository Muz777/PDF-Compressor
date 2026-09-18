import { outputFileName } from '../engine/exporter';
import { formatBytes } from '../engine/previewEngine';
import type { FinalResult, ValidationResult } from '../engine/types';

interface Props {
  result: FinalResult & { validation: ValidationResult };
  fileName: string;
  originalSize: number;
  onDownload: () => void;
  onAgain: () => void;
  onBack: () => void;
}

export default function ResultPanel({
  result,
  fileName,
  originalSize,
  onDownload,
  onAgain,
  onBack,
}: Props) {
  const v = result.validation;
  const reduction = ((originalSize - result.size) / originalSize) * 100;

  return (
    <div className="panel result">
      <div className="result__head">
        <div className="result__check">✓</div>
        <div>
          <h2>压缩完成</h2>
          <div className="muted">
            {fileName} → {outputFileName(fileName)}
          </div>
        </div>
      </div>

      <div className="stat-grid">
        <Stat label="原始" value={formatBytes(originalSize)} />
        <Stat label="压缩后" value={formatBytes(result.size)} />
        <Stat label="减少" value={`${reduction.toFixed(1)}%`} highlight={result.reachedTarget} />
        <Stat label="目标" value={result.reachedTarget ? '已达标 ✓' : '未达标'} highlight={result.reachedTarget} />
      </div>

      <div className="result__params">
        使用策略：JPEG Quality <b>{result.stage.quality}</b> · 最大长边 <b>{result.stage.maxLongEdge}px</b> · 尝试{' '}
        {result.attempts.length} 档
      </div>

      <div className={`verify ${v.ok ? 'verify--ok' : 'verify--fail'}`}>
        <div className="verify__title">输出校验</div>
        <div className="verify__grid">
          <Check label="页面数量" ok={v.pageCountMatch} detail={`${v.finalPages}`} />
          <Check label="页面尺寸" ok={v.pageSizeMatch} />
          <Check label="PDF 可打开" ok={v.ok} />
        </div>
        {v.error && <div className="verify__error">{v.error}</div>}
        {!v.ok && <div className="verify__warn">原始文件未受影响，可以安全重试。</div>}
      </div>

      <div className="panel__actions">
        <button className="btn btn--primary btn--lg" onClick={onDownload}>
          下载压缩版 PDF
        </button>
        <button className="btn btn--ghost" onClick={onAgain}>
          再次压缩
        </button>
        <button className="btn btn--ghost" onClick={onBack}>
          返回分析
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`stat ${highlight ? 'stat--ok' : ''}`}>
      <div className="stat__label">{label}</div>
      <div className="stat__value">{value}</div>
    </div>
  );
}

function Check({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="verify-item">
      <span className={ok ? 'ok' : 'fail'}>{ok ? '✓' : '×'}</span>
      <span>{label}</span>
      {detail && <span className="muted">{detail}</span>}
    </div>
  );
}
