import { formatBytes } from '../engine/previewEngine';
import type { CompressionStage } from '../engine/types';

interface Props {
  done: number;
  total: number;
  attempts: { stage: CompressionStage; size: number }[];
  targetBytes: number;
}

export default function ProgressView({ done, total, attempts, targetBytes }: Props) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const current = attempts[attempts.length - 1];

  return (
    <div className="panel progress">
      <div className="progress__title">正在压缩 PDF...</div>
      {current && (
        <div className="progress__stage">
          当前策略：Quality {current.stage.quality} · Max {current.stage.maxLongEdge}px
        </div>
      )}
      <div className="progress__bar">
        <div className="progress__fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="progress__count">
        页面 {Math.min(done, total)} / {total}
      </div>

      {attempts.length > 0 && (
        <div className="progress__attempts">
          {attempts.map((a, i) => (
            <div key={i} className="attempt">
              <span>
                {i + 1}. Quality {a.stage.quality} / {a.stage.maxLongEdge}px
              </span>
              <span className={a.size <= targetBytes ? 'ok' : 'over'}>
                {formatBytes(a.size)}
                {a.size <= targetBytes ? ' 已达标' : ' 超标，继续降档'}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="muted">全程本机处理，不上传任何数据。</p>
    </div>
  );
}
