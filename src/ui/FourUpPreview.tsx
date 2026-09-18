import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { buildVariants, estimateFinalSize, formatBytes, formatReduction } from '../engine/previewEngine';
import {
  DEFAULT_APPLY_QUALITY,
  DEFAULT_MAX_LONG_EDGE,
  DEFAULT_VARIANTS,
  QUALITY_MAX,
  QUALITY_MIN,
  TARGET_OPTIONS_MB,
} from '../engine/constants';
import type { FourUp } from '../engine/previewEngine';
import type { PreviewVariant } from '../engine/types';
import PreviewPane from './PreviewPane';

interface Props {
  fourUp: FourUp;
  pageCount: number;
  originalSize: number;
  building: boolean;
  onSelectPage: (pageIndex: number) => void;
  onApply: (settings: { quality: number; maxLongEdge: number; targetBytes: number }) => void;
  onBack: () => void;
}

const GAP = 8;
const ZOOM_STEPS = [1, 2, 4, 8];

export default function FourUpPreview({
  fourUp,
  pageCount,
  originalSize,
  building,
  onSelectPage,
  onApply,
  onBack,
}: Props) {
  const [qualities, setQualities] = useState<number[]>(DEFAULT_VARIANTS);
  const [variants, setVariants] = useState<PreviewVariant[]>([]);
  const [applyQuality, setApplyQuality] = useState(DEFAULT_APPLY_QUALITY);
  const [maxLongEdge, setMaxLongEdge] = useState(DEFAULT_MAX_LONG_EDGE);
  const [targetMB, setTargetMB] = useState(15);
  const [zoom, setZoom] = useState<number | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [enlarged, setEnlarged] = useState<{ src: HTMLCanvasElement; title: string } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [fitZoom, setFitZoom] = useState(0.2);
  const fitZoomRef = useRef(0.2);

  const iw = fourUp.originalCanvas.width;
  const ih = fourUp.originalCanvas.height;
  // 「原图」位图大小（RGBA 原始字节，作为对比基准）
  const originalRawBytes = iw * ih * 4;

  // 质量变体（原页只渲染一次，变体为压缩后重新解码的像素）
  useEffect(() => {
    let cancelled = false;
    buildVariants(fourUp.originalCanvas, qualities).then((next) => {
      if (!cancelled) setVariants(next);
    });
    return () => {
      cancelled = true;
    };
  }, [qualities, fourUp.originalCanvas]);

  // 计算「适应窗口」缩放
  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const cellW = Math.max(50, rect.width / 2 - GAP);
      const cellH = Math.max(50, rect.height / 2 - GAP);
      const fit = Math.min(cellW / iw, cellH / ih);
      const v = Number.isFinite(fit) && fit > 0 ? fit : 0.1;
      fitZoomRef.current = v;
      setFitZoom(v);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [iw, ih]);

  // 切换页面时重置缩放与拖动
  useEffect(() => {
    setZoom(null);
    setPan({ x: 0, y: 0 });
  }, [fourUp.pageIndex]);

  const effZoom = zoom ?? fitZoom;

  const onZoomBy = useCallback((factor: number) => {
    setZoom((z) => {
      const base = z ?? fitZoomRef.current;
      const min = fitZoomRef.current * 0.05;
      return Math.min(8, Math.max(min, base * factor));
    });
  }, []);

  const setZoomStep = useCallback((step: number | 'fit') => {
    setPan({ x: 0, y: 0 });
    setZoom(step === 'fit' ? null : step);
  }, []);

  const onPanBy = useCallback(
    (dx: number, dy: number) => {
      setPan((p) => {
        const z = zoom ?? fitZoomRef.current;
        const drawnW = iw * z;
        const drawnH = ih * z;
        const maxX = Math.max(0, drawnW / 2);
        const maxY = Math.max(0, drawnH / 2);
        const nx = Math.min(maxX, Math.max(-maxX, p.x + dx));
        const ny = Math.min(maxY, Math.max(-maxY, p.y + dy));
        return { x: nx, y: ny };
      });
    },
    [zoom, iw, ih],
  );

  const apply = () => {
    onApply({ quality: applyQuality, maxLongEdge, targetBytes: targetMB * 1024 * 1024 });
  };

  const setQualityAt = (idx: number, value: number) => {
    const v = Math.min(QUALITY_MAX, Math.max(QUALITY_MIN, Math.round(value) || QUALITY_MIN));
    setQualities((q) => q.map((x, i) => (i === idx ? v : x)));
  };

  const paneEstimate = (bytes: number) => formatBytes(estimateFinalSize(pageCount, bytes));

  const originalPane = {
    src: fourUp.originalCanvas,
    title: 'ORIGINAL',
    quality: null as number | null,
    bytes: originalRawBytes,
    accent: 'original' as const,
  };
  const variantPanes = variants.map((v) => ({
    src: v.canvas,
    title: v.label,
    quality: v.quality,
    bytes: v.bytes,
    accent: 'variant' as const,
  }));

  const panes = [originalPane, ...variantPanes];

  return (
    <div className="fourup">
      <div className="fourup__toolbar">
        <button className="btn btn--ghost" onClick={onBack}>
          ← 返回
        </button>
        <div className="toolbar-group">
          <span className="toolbar-label">缩放</span>
          <button className="btn btn--ghost btn--sm" onClick={() => setZoomStep('fit')}>
            适应
          </button>
          {ZOOM_STEPS.map((s) => (
            <button key={s} className="btn btn--ghost btn--sm" onClick={() => setZoomStep(s)}>
              {s * 100}%
            </button>
          ))}
          <span className="toolbar-hint">滚轮缩放 · 拖动平移（四联同步）</span>
        </div>
      </div>

      <div className="fourup__main">
        <aside className="fourup__sidebar">
          <div className="sidebar-title">
            页面（{pageCount}）
            {building && <span className="spinner" />}
          </div>
          <div className="sidebar-list">
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                className={`img-item ${n === fourUp.pageIndex ? 'img-item--active' : ''}`}
                onClick={() => onSelectPage(n)}
              >
                <span className="img-item__name">第 {n} 页</span>
                <span className="img-item__sub">点击设为预览页</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="fourup__grid" ref={gridRef}>
          {panes.map((p, i) => {
            if (i > 0 && !p.src) {
              return (
                <div key={i} className="pane pane--empty">
                  <div className="pane__body">
                    <span className="spinner" /> 正在生成预览…
                  </div>
                </div>
              );
            }
            const selected = p.quality !== null && p.quality === applyQuality;
            const meta = [
              { label: '尺寸', value: `${p.src.width}×${p.src.height}` },
              { label: '大小', value: formatBytes(p.bytes) },
            ];
            if (p.quality !== null) {
              meta.push({ label: '减少', value: formatReduction(originalRawBytes, p.bytes) });
            }
            return (
              <PreviewPane
                key={i}
                src={p.src}
                zoom={effZoom}
                pan={pan}
                selected={selected}
                onPanBy={onPanBy}
                onWheelDelta={(d) => onZoomBy(d < 0 ? 1.1 : 1 / 1.1)}
                onSelect={() => {
                  if (p.quality !== null) setApplyQuality(p.quality);
                }}
                onEnlarge={() => setEnlarged({ src: p.src, title: p.title })}
                info={{
                  title: p.title,
                  meta,
                  accent: selected ? 'selected' : p.accent,
                  estimate: p.quality !== null ? `预计输出 PDF ${paneEstimate(p.bytes)}` : undefined,
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="fourup__controls">
        <div className="controls-row">
          <div className="control-group">
            <label>质量档位</label>
            {qualities.map((q, i) => (
              <input
                key={i}
                className="input input--num"
                type="number"
                min={QUALITY_MIN}
                max={QUALITY_MAX}
                value={q}
                onChange={(e) => setQualityAt(i, Number(e.target.value))}
              />
            ))}
          </div>
          <div className="control-group">
            <label>应用质量</label>
            <span className="apply-quality">{applyQuality}</span>
            <span className="control-hint">点击某个预览窗设为应用质量</span>
          </div>
          <div className="control-group">
            <label>最大尺寸</label>
            <input
              className="input input--num"
              type="number"
              min={200}
              value={maxLongEdge}
              onChange={(e) => setMaxLongEdge(Math.max(200, Number(e.target.value) || 200))}
            />
            <span className="control-unit">px</span>
          </div>
          <div className="control-group">
            <label>目标大小</label>
            <select className="input" value={targetMB} onChange={(e) => setTargetMB(Number(e.target.value))}>
              {TARGET_OPTIONS_MB.map((m) => (
                <option key={m} value={m}>
                  {m} MB
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="controls-row controls-row--checks">
          <span className="check-hint">整页栅格化 · 输出格式 JPEG · 原始 {formatBytes(originalSize)} · 预计大小按当前页估算</span>
        </div>
        <div className="controls-row">
          <button className="btn btn--primary" onClick={apply}>
            应用 Quality {applyQuality} 并压缩全部 {pageCount} 页
          </button>
        </div>
      </div>

      {enlarged && (
        <div className="lightbox" onClick={() => setEnlarged(null)}>
          <div className="lightbox__title">{enlarged.title} · 点击关闭</div>
          <LightboxCanvas src={enlarged.src} />
        </div>
      )}
    </div>
  );
}

function LightboxCanvas({ src }: { src: HTMLCanvasElement }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const cw = window.innerWidth * 0.92;
      const ch = window.innerHeight * 0.82;
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const scale = Math.min(cw / src.width, ch / src.height);
      const w = src.width * scale;
      const h = src.height * scale;
      ctx.drawImage(src, (cw - w) / 2, (ch - h) / 2, w, h);
    };
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [src]);
  return <canvas ref={ref} className="lightbox__canvas" />;
}
