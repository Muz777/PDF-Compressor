import { useEffect, useRef } from 'react';

export interface PaneInfo {
  title: string;
  meta: { label: string; value: string }[];
  accent: 'original' | 'variant' | 'selected';
  estimate?: string;
}

interface Props {
  src: HTMLCanvasElement;
  info: PaneInfo;
  zoom: number;
  pan: { x: number; y: number };
  selected: boolean;
  onPanBy: (dx: number, dy: number) => void;
  onWheelDelta: (deltaY: number) => void;
  onSelect: () => void;
  onEnlarge: () => void;
}

export default function PreviewPane({
  src,
  info,
  zoom,
  pan,
  selected,
  onPanBy,
  onWheelDelta,
  onSelect,
  onEnlarge,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ x: 0, y: 0, active: false });
  const wheelRef = useRef(onWheelDelta);
  wheelRef.current = onWheelDelta;

  // 绘制：根据共享 zoom/pan 重绘（四联同步缩放/拖动，文档 §6/§7）
  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas || !box) return;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const cw = box.clientWidth;
      const ch = box.clientHeight;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#101215';
      ctx.fillRect(0, 0, cw, ch);

      const iw = src.width;
      const ih = src.height;
      const drawnW = iw * zoom;
      const drawnH = ih * zoom;
      const x = (cw - drawnW) / 2 + pan.x;
      const y = (ch - drawnH) / 2 + pan.y;
      ctx.imageSmoothingEnabled = zoom < 1;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(src, 0, 0, iw, ih, x, y, drawnW, drawnH);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(box);
    return () => ro.disconnect();
  }, [src, zoom, pan]);

  // wheel 需非被动监听才能 preventDefault
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      wheelRef.current(e.deltaY);
    };
    box.addEventListener('wheel', handler, { passive: false });
    return () => box.removeEventListener('wheel', handler);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY, active: true };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    dragRef.current.x = e.clientX;
    dragRef.current.y = e.clientY;
    onPanBy(dx, dy);
  };
  const onPointerUp = () => {
    dragRef.current.active = false;
  };

  return (
    <div
      className={`pane ${selected ? 'pane--selected' : ''}`}
      onClick={onSelect}
      onDoubleClick={onEnlarge}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="pane__header">
        <span className={`pane__tag pane__tag--${info.accent}`}>{info.title}</span>
        <span className="pane__meta">
          {info.meta.map((m) => (
            <span key={m.label}>
              {m.label} <b>{m.value}</b>
            </span>
          ))}
        </span>
      </div>
      <div className="pane__body" ref={boxRef}>
        <canvas ref={canvasRef} className="pane__canvas" />
      </div>
      {info.estimate && <div className="pane__estimate">{info.estimate}</div>}
    </div>
  );
}
