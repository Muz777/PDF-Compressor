/**
 * 尺寸控制器 —— 目标大小自动控制与逐级降档压缩（文档 §25/§26/§27）。
 * 先以较高质量尝试，超目标则逐级降低 Quality / 最大长边，尽量少损失画质。
 */
import { buildLadder } from './constants';
import { compressPdfPages } from './compressionEngine';
import type { CompressionSettings, CompressionStage, CompressOutput, FinalResult } from './types';

export interface SizeControlOptions {
  targetBytes: number;
  baseQuality: number;
  baseMaxEdge: number;
  onProgress?: (done: number, total: number) => void;
  onStage?: (stage: CompressionStage, size: number, index: number) => void;
}

export async function compressToTarget(
  originalBytes: Uint8Array,
  opts: SizeControlOptions,
): Promise<FinalResult> {
  const ladder = buildLadder(opts.baseQuality, opts.baseMaxEdge);
  const attempts: { stage: CompressionStage; size: number }[] = [];
  let last: CompressOutput | null = null;

  for (let i = 0; i < ladder.length; i++) {
    const stage = ladder[i];
    const settings: CompressionSettings = {
      quality: stage.quality,
      maxLongEdge: stage.maxLongEdge,
      progressive: true,
      optimized: true,
      stripMetadata: true,
    };
    last = await compressPdfPages(originalBytes, settings, opts.onProgress);
    attempts.push({ stage, size: last.size });
    opts.onStage?.(stage, last.size, i);

    if (last.size <= opts.targetBytes) {
      return { bytes: last.bytes, size: last.size, reachedTarget: true, stage, attempts };
    }
  }

  const final = last as CompressOutput;
  return { bytes: final.bytes, size: final.size, reachedTarget: false, stage: ladder[ladder.length - 1], attempts };
}
