/** 页面尺寸（PDF 点，1/72 英寸） */
export interface PageSize {
  widthPt: number;
  heightPt: number;
}

/** 压缩参数 */
export interface CompressionSettings {
  quality: number; // 1..100
  maxLongEdge: number; // 渲染位图长边最大像素，0 = 使用默认
  progressive: boolean;
  optimized: boolean;
  stripMetadata: boolean;
}

/** 自动压缩阶梯档位 */
export interface CompressionStage {
  quality: number;
  maxLongEdge: number;
}

/** 单页压缩结果 */
export interface PageResult {
  pageIndex: number; // 1-based
  after: number; // 压缩后字节
  widthPx: number;
  heightPx: number;
}

/** 一次压缩输出 */
export interface CompressOutput {
  bytes: Uint8Array;
  size: number;
  pages: number;
  perPage: PageResult[];
}

/** 尺寸控制最终结果 */
export interface FinalResult {
  bytes: Uint8Array;
  size: number;
  reachedTarget: boolean;
  stage: CompressionStage;
  attempts: { stage: CompressionStage; size: number }[];
}

/** 四联预览的单个质量变体 */
export interface PreviewVariant {
  quality: number;
  label: string;
  bytes: number;
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
}

/** 校验结果 */
export interface ValidationResult {
  ok: boolean;
  pageCountMatch: boolean;
  pageSizeMatch: boolean;
  finalPages: number;
  finalSize: number;
  error?: string;
}
