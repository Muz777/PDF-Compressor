/**
 * PDF 引擎 —— 用 pdf.js 在浏览器本地解析并渲染页面，用 pdf-lib 重组成新的 PDF。
 *
 * 模式：整页栅格化（兼容模式）。每一页渲染成一张位图 → JPEG 压缩 → 按原页面尺寸重写 PDF。
 * 全部在本机完成，零网络请求（文档 §47/§48）。
 */
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import PdfJsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&inline';
import { PDFDocument } from 'pdf-lib';
import { MAX_RENDER_SCALE } from './constants';
import type { PageSize } from './types';

// 关键：内联 worker，避免 file:// 下加载独立 worker 文件
GlobalWorkerOptions.workerPort = new PdfJsWorker();

export class PdfEncryptedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfEncryptedError';
  }
}

export class PdfParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfParseError';
  }
}

export interface LoadedPdf {
  doc: PDFDocumentProxy;
  pageCount: number;
  pageSizes: PageSize[];
}

/** 用 pdf.js 加载 PDF，读取页数与各页尺寸（已含旋转方向） */
export async function loadPdf(bytes: Uint8Array): Promise<LoadedPdf> {
  let doc: PDFDocumentProxy;
  try {
    const task = getDocument({
      data: bytes.slice(),
      useSystemFonts: true,
      isEvalSupported: false,
    });
    doc = await task.promise;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/password/i.test(msg)) {
      throw new PdfEncryptedError('该 PDF 受密码保护，请先解除密码后再重新处理。');
    }
    throw new PdfParseError(`无法解析该 PDF：文件可能损坏或结构不兼容。（${msg}）`);
  }

  const pageCount = doc.numPages;
  const pageSizes: PageSize[] = [];
  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    pageSizes.push({ widthPt: vp.width, heightPt: vp.height });
  }

  return { doc, pageCount, pageSizes };
}

/** 计算渲染缩放：按目标长边像素，限制在合理范围内 */
export function scaleForPage(size: PageSize, maxLongEdge: number): number {
  const longEdge = Math.max(size.widthPt, size.heightPt);
  if (longEdge <= 0) return 1;
  const scale = maxLongEdge > 0 ? maxLongEdge / longEdge : 1;
  return Math.min(MAX_RENDER_SCALE, Math.max(0.3, scale));
}

/** 渲染某一页为白底位图 */
export async function renderPageToCanvas(
  doc: PDFDocumentProxy,
  pageIndex: number, // 1-based
  scale: number,
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageIndex);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(viewport.width));
  canvas.height = Math.max(1, Math.round(viewport.height));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({
    canvasContext: ctx,
    viewport,
    background: '#ffffff',
  }).promise;
  return canvas;
}

/** 用 pdf-lib 把各页 JPEG 按原页面尺寸重组成新 PDF */
export async function rebuildPdfFromPages(
  pages: { jpegBytes: Uint8Array; widthPt: number; heightPt: number }[],
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const pg of pages) {
    const page = out.addPage([pg.widthPt, pg.heightPt]);
    const img = await out.embedJpg(pg.jpegBytes);
    page.drawImage(img, { x: 0, y: 0, width: pg.widthPt, height: pg.heightPt });
  }
  return await out.save({ useObjectStreams: true });
}
