import { useCallback, useState } from 'react';
import { loadPdf, renderPageToCanvas, scaleForPage } from './engine/pdfEngine';
import { compressToTarget } from './engine/sizeController';
import { validatePdf } from './engine/validator';
import { downloadBlob, outputFileName } from './engine/exporter';
import { PREVIEW_MAX_EDGE } from './engine/constants';
import type { LoadedPdf } from './engine/pdfEngine';
import type { FourUp } from './engine/previewEngine';
import type { CompressionStage, FinalResult, ValidationResult } from './engine/types';
import DropZone from './ui/DropZone';
import AnalysisPanel from './ui/AnalysisPanel';
import FourUpPreview from './ui/FourUpPreview';
import ProgressView from './ui/ProgressView';
import ResultPanel from './ui/ResultPanel';

type Stage = 'idle' | 'analyzing' | 'ready' | 'preview' | 'compressing' | 'done';

interface ApplySettings {
  quality: number;
  maxLongEdge: number;
  targetBytes: number;
}

export default function App() {
  const [stage, setStage] = useState<Stage>('idle');
  const [fileName, setFileName] = useState('');
  const [originalBytes, setOriginalBytes] = useState<Uint8Array | null>(null);
  const [loaded, setLoaded] = useState<LoadedPdf | null>(null);
  const [fourUp, setFourUp] = useState<FourUp | null>(null);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [attempts, setAttempts] = useState<{ stage: CompressionStage; size: number }[]>([]);
  const [result, setResult] = useState<(FinalResult & { validation: ValidationResult }) | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setStage('analyzing');
    setFileName(file.name);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const doc = await loadPdf(bytes);
      setOriginalBytes(bytes);
      setLoaded(doc);
      setStage('ready');
    } catch (e) {
      setOriginalBytes(null);
      setLoaded(null);
      setError(e instanceof Error ? e.message : '未知错误');
      setStage('idle');
    }
  }, []);

  const renderPreview = useCallback(
    async (pageIndex: number, thenStage: Stage) => {
      if (!loaded) return;
      setBuilding(true);
      try {
        const size = loaded.pageSizes[pageIndex - 1];
        const scale = scaleForPage(size, PREVIEW_MAX_EDGE);
        const canvas = await renderPageToCanvas(loaded.doc, pageIndex, scale);
        setFourUp({
          pageIndex,
          originalCanvas: canvas,
          widthPt: size.widthPt,
          heightPt: size.heightPt,
          variants: [],
        });
        setStage(thenStage);
      } catch (e) {
        setError(e instanceof Error ? e.message : '页面渲染失败');
      } finally {
        setBuilding(false);
      }
    },
    [loaded],
  );

  const enterPreview = useCallback(() => {
    void renderPreview(1, 'preview');
  }, [renderPreview]);

  const selectPage = useCallback(
    (pageIndex: number) => {
      void renderPreview(pageIndex, 'preview');
    },
    [renderPreview],
  );

  const apply = useCallback(
    async (settings: ApplySettings) => {
      if (!originalBytes || !loaded) return;
      setStage('compressing');
      setProgress({ done: 0, total: 0 });
      setAttempts([]);
      try {
        const final = await compressToTarget(originalBytes, {
          targetBytes: settings.targetBytes,
          baseQuality: settings.quality,
          baseMaxEdge: settings.maxLongEdge,
          onProgress: (done, total) => setProgress({ done, total }),
          onStage: (stage, size) => setAttempts((a) => [...a, { stage, size }]),
        });
        const validation = await validatePdf(final.bytes, {
          pageCount: loaded.pageCount,
          pageSizes: loaded.pageSizes,
        });
        setResult({ ...final, validation });
        setStage('done');
      } catch (e) {
        setError(e instanceof Error ? e.message : '压缩失败');
        setStage('preview');
      }
    },
    [originalBytes, loaded],
  );

  const reset = useCallback(() => {
    setStage('idle');
    setFileName('');
    setOriginalBytes(null);
    setLoaded(null);
    setFourUp(null);
    setResult(null);
    setError(null);
    setProgress({ done: 0, total: 0 });
    setAttempts([]);
  }, []);

  const backToAnalysis = useCallback(() => {
    setFourUp(null);
    setStage('ready');
  }, []);

  const download = useCallback(() => {
    if (result) downloadBlob(result.bytes, outputFileName(fileName));
  }, [result, fileName]);

  return (
    <div className="app">
      <header className="app__header">
        <div className="brand">
          <span className="brand__logo">PDF</span>
          <span className="brand__name">PDF Compressor</span>
          <span className="brand__sub">本地整页压缩 · 四联预览</span>
        </div>
        <div className="brand__secure">文件仅在本机处理</div>
      </header>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button className="btn btn--ghost btn--sm" onClick={() => setError(null)}>
            关闭
          </button>
        </div>
      )}

      <main className="app__main">
        {stage === 'idle' && <DropZone onFile={handleFile} />}

        {stage === 'analyzing' && (
          <div className="panel loading">
            <span className="spinner" /> 正在分析 PDF...
          </div>
        )}

        {stage === 'ready' && loaded && (
          <AnalysisPanel
            pageCount={loaded.pageCount}
            pageSizes={loaded.pageSizes}
            originalSize={originalBytes?.length ?? 0}
            fileName={fileName}
            entering={building}
            onEnterPreview={enterPreview}
            onBack={reset}
          />
        )}

        {stage === 'preview' && fourUp && loaded && (
          <FourUpPreview
            fourUp={fourUp}
            pageCount={loaded.pageCount}
            originalSize={originalBytes?.length ?? 0}
            building={building}
            onSelectPage={selectPage}
            onApply={apply}
            onBack={backToAnalysis}
          />
        )}

        {stage === 'compressing' && (
          <ProgressView done={progress.done} total={progress.total} attempts={attempts} targetBytes={15 * 1024 * 1024} />
        )}

        {stage === 'done' && result && (
          <ResultPanel
            result={result}
            fileName={fileName}
            originalSize={originalBytes?.length ?? 0}
            onDownload={download}
            onAgain={reset}
            onBack={backToAnalysis}
          />
        )}
      </main>

      <footer className="app__footer">
        完全本地处理 · 零网络请求 · 原文件不会被覆盖 · 输出为“原名_压缩版.pdf”
      </footer>
    </div>
  );
}
