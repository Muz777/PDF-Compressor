/**
 * PDF 校验器 —— 压缩后重新打开验证页数与页面尺寸（文档 §31/§66）。
 */
import { loadPdf } from './pdfEngine';
import type { PageSize, ValidationResult } from './types';

export async function validatePdf(
  bytes: Uint8Array,
  expected: { pageCount: number; pageSizes: PageSize[] },
): Promise<ValidationResult> {
  const base: ValidationResult = {
    ok: false,
    pageCountMatch: false,
    pageSizeMatch: false,
    finalPages: 0,
    finalSize: bytes.length,
  };

  try {
    const { pageCount, pageSizes } = await loadPdf(bytes);
    const pageCountMatch = pageCount === expected.pageCount;
    const pageSizeMatch =
      pageCount === expected.pageCount &&
      pageSizes.every(
        (s, i) =>
          Math.abs(s.widthPt - expected.pageSizes[i].widthPt) < 1 &&
          Math.abs(s.heightPt - expected.pageSizes[i].heightPt) < 1,
      );

    return {
      ok: pageCountMatch && pageSizeMatch,
      pageCountMatch,
      pageSizeMatch,
      finalPages: pageCount,
      finalSize: bytes.length,
    };
  } catch (e) {
    return { ...base, error: e instanceof Error ? e.message : 'PDF 校验失败' };
  }
}
