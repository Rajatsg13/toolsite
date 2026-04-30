'use client';
import { useState } from 'react';

const MAX_FILE_MB    = 50;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const fmtSize = (b) => b >= 1048576 ? (b/1048576).toFixed(1)+' MB' : (b/1024).toFixed(0)+' KB';

function parseRanges(input, totalPages) {
  // Parse "1-3, 5, 7-9" into array of {label, pages:[0-indexed]}
  const parts = input.split(',').map(s => s.trim()).filter(Boolean);
  const groups = [];
  for (const part of parts) {
    const dash = part.indexOf('-');
    if (dash > 0) {
      const from = parseInt(part.slice(0, dash), 10);
      const to   = parseInt(part.slice(dash + 1), 10);
      if (isNaN(from) || isNaN(to) || from < 1 || to < from || to > totalPages) return null;
      groups.push({ label: `pages_${from}-${to}`, pages: Array.from({length: to-from+1}, (_, i) => from-1+i) });
    } else {
      const p = parseInt(part, 10);
      if (isNaN(p) || p < 1 || p > totalPages) return null;
      groups.push({ label: `page_${p}`, pages: [p-1] });
    }
  }
  return groups.length ? groups : null;
}

export default function PDFSplit() {
  const [file, setFile]         = useState(null); // {file, name, bytes, pageCount}
  const [mode, setMode]         = useState('each'); // 'each' | 'ranges'
  const [ranges, setRanges]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);

  const loadFile = async (f) => {
    setError(''); setDone(false);
    if (!f || f.type !== 'application/pdf') { setError('Please select a PDF file.'); return; }
    if (f.size > MAX_FILE_BYTES) { setError(`File is ${fmtSize(f.size)} — max is ${MAX_FILE_MB} MB.`); return; }
    // Count pages
    try {
      const { PDFDocument } = await import('pdf-lib');
      const bytes = await f.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      setFile({ file: f, name: f.name, bytes: f.size, pageCount: doc.getPageCount() });
    } catch(e) {
      setError('Could not read PDF: ' + e.message);
    }
  };

  const split = async () => {
    if (!file) return;
    setError(''); setLoading(true); setDone(false);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const srcBytes = await file.file.arrayBuffer();
      const src = await PDFDocument.load(srcBytes);
      const total = src.getPageCount();

      let groups;
      if (mode === 'each') {
        groups = Array.from({length: total}, (_, i) => ({ label: `page_${i+1}`, pages: [i] }));
      } else {
        groups = parseRanges(ranges, total);
        if (!groups) { setError(`Invalid range. Use format like "1-3, 5, 7-9". Max page: ${total}`); setLoading(false); return; }
      }

      for (const g of groups) {
        const out = await PDFDocument.create();
        const copied = await out.copyPages(src, g.pages);
        copied.forEach(p => out.addPage(p));
        const outBytes = await out.save();
        const blob = new Blob([outBytes], { type: 'application/pdf' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const base = file.name.replace(/\.pdf$/i, '');
        a.download = `${base}_${g.label}.pdf`;
        a.click();
        // small delay between downloads
        await new Promise(r => setTimeout(r, 300));
      }
      setDone(true);
    } catch(e) {
      setError('Split failed: ' + e.message);
    }
    setLoading(false);
  };

  return (
    <div className="tool-container">
      <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-1">Split PDF</h1>
      <p className="text-slate-500 mb-8 text-sm">Split a PDF into individual pages or custom page ranges. Free &amp; private — runs entirely in your browser.</p>

      <div className="ad-slot h-20 mb-8">[ AdSense — Leaderboard ]</div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-2">
          <span>⚠️</span>{error}
        </div>
      )}

      {done && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 flex items-start gap-2">
          <span>✅</span>All parts downloaded successfully!
        </div>
      )}

      {/* Drop zone */}
      {!file ? (
        <div className={`drop-zone mb-6 ${dragging ? 'active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); loadFile(e.dataTransfer.files[0]); }}
          onClick={() => document.getElementById('pdf-split-input').click()}>
          <div className="text-4xl mb-3">📄</div>
          <p className="font-semibold text-slate-700">Drop a PDF here or <span className="text-brand-700 underline">browse</span></p>
          <p className="text-xs text-slate-400 mt-1">Max {MAX_FILE_MB} MB</p>
          <input id="pdf-split-input" type="file" accept=".pdf" className="hidden"
            onChange={e => loadFile(e.target.files[0])} />
        </div>
      ) : (
        <div className="mb-6 flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
          <span className="text-3xl">📄</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
            <p className="text-xs text-slate-400">{file.pageCount} pages · {fmtSize(file.bytes)}</p>
          </div>
          <button onClick={() => { setFile(null); setDone(false); setError(''); }}
            className="text-xs text-red-500 hover:text-red-700 font-medium">Change</button>
        </div>
      )}

      {file && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5 mb-6">
          {/* Mode */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Split Mode</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setMode('each')}
                className={`py-3 px-4 rounded-xl text-sm font-medium border transition-colors text-left
                  ${mode === 'each' ? 'bg-brand-700 text-white border-brand-700' : 'text-slate-600 border-slate-200 hover:border-brand-300'}`}>
                <div className="font-bold mb-0.5">📑 Split into pages</div>
                <div className={`text-xs ${mode === 'each' ? 'text-blue-200' : 'text-slate-400'}`}>One PDF per page ({file.pageCount} files)</div>
              </button>
              <button onClick={() => setMode('ranges')}
                className={`py-3 px-4 rounded-xl text-sm font-medium border transition-colors text-left
                  ${mode === 'ranges' ? 'bg-brand-700 text-white border-brand-700' : 'text-slate-600 border-slate-200 hover:border-brand-300'}`}>
                <div className="font-bold mb-0.5">✂️ Custom ranges</div>
                <div className={`text-xs ${mode === 'ranges' ? 'text-blue-200' : 'text-slate-400'}`}>Specify page groups</div>
              </button>
            </div>
          </div>

          {mode === 'ranges' && (
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">Page Ranges</label>
              <input type="text" value={ranges} onChange={e => setRanges(e.target.value)}
                placeholder={`e.g. 1-3, 5, 7-${Math.min(9, file.pageCount)}`}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              <p className="text-xs text-slate-400 mt-1.5">Comma-separated ranges. Each group downloads as a separate PDF. Pages: 1 to {file.pageCount}.</p>
            </div>
          )}

          {mode === 'each' && file.pageCount > 20 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              ⚠️ This will download {file.pageCount} files — your browser may ask to allow multiple downloads.
            </div>
          )}

          <button onClick={split} disabled={loading}
            className="w-full py-4 bg-brand-700 hover:bg-brand-800 disabled:bg-slate-300 text-white font-bold rounded-xl transition-colors">
            {loading ? '⏳ Splitting & downloading…' : `✂️ Split PDF & Download`}
          </button>
        </div>
      )}

      <div className="mt-4 bg-slate-50 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">How to Split a PDF</h2>
        <ol className="space-y-3">
          {[
            'Upload your PDF file (up to 50 MB).',
            'Choose "Split into pages" to get one PDF per page, or "Custom ranges" to group pages (e.g. 1-3, 4-6).',
            'Click Split — each part downloads automatically to your device.',
          ].map((s, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-600">
              <span className="w-6 h-6 flex-shrink-0 rounded-full bg-brand-700 text-white text-xs font-bold flex items-center justify-center mt-0.5">{i+1}</span>{s}
            </li>
          ))}
        </ol>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {[
            ['What is the maximum file size?', `Up to ${MAX_FILE_MB} MB. For larger files, try compressing with our PDF Compress tool first.`],
            ['How many pages can I extract?', 'No limit on page count — you can split a 500-page document into individual pages.'],
            ['Does splitting reduce quality?', 'No. pdf-lib copies pages at their original resolution without any re-encoding.'],
            ['Are my files uploaded anywhere?', 'Never. All processing happens in your browser. Your files stay on your device.'],
          ].map(([q, a]) => (
            <details key={q} className="faq-item bg-white border border-slate-100 rounded-xl overflow-hidden">
              <summary className="px-5 py-4 font-semibold text-slate-700 text-sm flex justify-between items-center">
                {q}<span className="text-brand-600 text-lg">+</span>
              </summary>
              <div className="px-5 pb-4 text-sm text-slate-600">{a}</div>
            </details>
          ))}
        </div>
      </section>
      <div className="ad-slot h-24 mt-10">[ AdSense — Rectangle ]</div>
    </div>
  );
}
