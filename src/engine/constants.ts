import type { CompressionStage } from './types';

/** 默认目标大小：15 MB */
export const DEFAULT_TARGET_BYTES = 15 * 1024 * 1024;

/** 默认整页位图长边（像素） */
export const DEFAULT_MAX_LONG_EDGE = 2500;

/** 预览渲染长边（像素）——足够判断 JPEG 画质差异 */
export const PREVIEW_MAX_EDGE = 1400;

/** 渲染缩放上限（避免内存爆炸） */
export const MAX_RENDER_SCALE = 4.0;

/** 四联预览默认三个压缩质量档 */
export const DEFAULT_VARIANTS: number[] = [30, 25, 20];

/** 默认应用质量 */
export const DEFAULT_APPLY_QUALITY = 25;

/** 质量可调范围 */
export const QUALITY_MIN = 5;
export const QUALITY_MAX = 95;

/** 目标大小可选项（MB） */
export const TARGET_OPTIONS_MB = [5, 10, 15, 20, 30];

/** 自动压缩阶梯（文档 §27） */
export const FULL_LADDER: CompressionStage[] = [
  { quality: 30, maxLongEdge: 3000 },
  { quality: 28, maxLongEdge: 2500 },
  { quality: 25, maxLongEdge: 2200 },
  { quality: 22, maxLongEdge: 1800 },
  { quality: 20, maxLongEdge: 1600 },
  { quality: 18, maxLongEdge: 1400 },
  { quality: 15, maxLongEdge: 1200 },
];

/** 从用户选择的基准档位出发，生成向下递减的阶梯 */
export function buildLadder(baseQuality: number, baseMaxEdge: number): CompressionStage[] {
  const stages: CompressionStage[] = [{ quality: baseQuality, maxLongEdge: baseMaxEdge }];
  for (const s of FULL_LADDER) {
    if (s.quality < baseQuality || (s.quality === baseQuality && s.maxLongEdge < baseMaxEdge)) {
      stages.push(s);
    }
  }
  return stages;
}
