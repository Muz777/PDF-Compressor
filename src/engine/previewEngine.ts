/**
 * 四联预览引擎 —— 渲染代表性页面、估算最终 PDF 大小、格式化工具。
 * 预览只看第一页（或用户选择的页），选定质量后套用到全部页面。
 */
import { encodeJpeg, jpegBytesToCanvas } from './imageEngine';
import type { PreviewVariant } from './types';

export interface FourUp {
  pageIndex: number; // 1-based
  originalCanvas: HTMLCanvasElement;
  widthPt: number;
  heightPt: number;
  variants: PreviewVariant[];
}

/** 由原页画布生成多个质量变体（变体为压缩后重新解码的像素，展示真实画质损失） */
export async function buildVariants(
  originalCanvas: HTMLCanvasElement,
  qualities: number[],
): Promise<PreviewVariant[]> {
  const variants: PreviewVariant[] = [];
  for (const q of qualities) {
    const enc = await encodeJpeg(originalCanvas, q / 100);
    const canvas = await jpegBytesToCanvas(enc.bytes);
    variants.push({
      quality: q,
      label: `JPEG ${q}`,
      bytes: enc.bytes.length,
      width: enc.width,
      height: enc.height,
      canvas,
    });
  }
  return variants;
}

/**
 * 估算最终 PDF 大小（文档 §29/§30，仅「预计」）。
 * 按代表性页面 × 页数近似，并保留少量结构开销。
 */
export function estimateFinalSize(pageCount: number, repCompressedBytes: number): number {
  return Math.round(pageCount * repCompressedBytes * 1.02 + 4096);
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function formatReduction(before: number, after: number): string {
  if (before <= 0) return '—';
  const pct = ((before - after) / before) * 100;
  return `${pct >= 0 ? '-' : '+'}${Math.abs(pct).toFixed(1)}%`;
}
