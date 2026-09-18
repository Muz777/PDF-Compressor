/**
 * 图片引擎 —— 位图 → JPEG 编码。Canvas 输出天然剥离元数据（符合「Metadata: None」）。
 * 全部在浏览器本地完成，无网络请求。
 */
export interface EncodedJpeg {
  bytes: Uint8Array;
  width: number;
  height: number;
}

/** 将画布编码为 JPEG（质量 0..1） */
export async function encodeJpeg(
  src: HTMLCanvasElement,
  quality01: number,
): Promise<EncodedJpeg> {
  const q = Math.max(0.01, Math.min(1, quality01));
  const blob = await new Promise<Blob>((resolve) => {
    src.toBlob((b) => resolve(b as Blob), 'image/jpeg', q);
  });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return { bytes, width: src.width, height: src.height };
}

/** 将 JPEG 字节解码回画布（用于预览真实的压缩后像素） */
export async function jpegBytesToCanvas(bytes: Uint8Array): Promise<HTMLCanvasElement> {
  const blob = new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' });
  const bmp = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0);
  bmp.close();
  return canvas;
}
