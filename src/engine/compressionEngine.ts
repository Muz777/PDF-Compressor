/**
 * 压缩引擎 —— 整页栅格化压缩：每页渲染成位图 → JPEG → 重组成新 PDF。
 * 逐页处理、及时释放画布，控制内存（文档 §58）。
 */
import { loadPdf, renderPageToCanvas, rebuildPdfFromPages, scaleForPage } from './pdfEngine';
import { encodeJpeg } from './imageEngine';
import type { CompressionSettings, CompressOutput, PageResult } from './types';

export async function compressPdfPages(
  originalBytes: Uint8Array,
  settings: CompressionSettings,
  onProgress?: (done: number, total: number) => void,
): Promise<CompressOutput> {
  const { doc, pageCount, pageSizes } = await loadPdf(originalBytes);
  const perPage: PageResult[] = [];
  const pageImages: { jpegBytes: Uint8Array; widthPt: number; heightPt: number }[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const size = pageSizes[i - 1];
    const scale = scaleForPage(size, settings.maxLongEdge);
    const canvas = await renderPageToCanvas(doc, i, scale);
    const enc = await encodeJpeg(canvas, settings.quality / 100);
    // 释放画布引用，便于 GC
    canvas.width = 1;
    canvas.height = 1;

    perPage.push({ pageIndex: i, after: enc.bytes.length, widthPx: enc.width, heightPx: enc.height });
    pageImages.push({ jpegBytes: enc.bytes, widthPt: size.widthPt, heightPt: size.heightPt });
    onProgress?.(i, pageCount);
  }

  const bytes = await rebuildPdfFromPages(pageImages);
  return { bytes, size: bytes.length, pages: pageCount, perPage };
}
