'use client';
import { useState, useRef, useCallback } from 'react';

const FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

export default function ImageResize() {
  const [original, setOriginal]   = useState(null); // { src, w, h, name, type, size }
  const [width, setWidth]         = useState('');
  const [height, setHeight]       = useState('');
  const [keepRatio, setKeepRatio] = useState(true);
  const [quality, setQuality]     = useState(85);
  const [format, setFormat]       = useState('image/jpeg');
  const [dragging, setDragging]   = useState(false);
  const [preview, setPreview]     = useState(null); // base64 preview
  const [outputSize, setOutputSize] = useState(null);
  const canvasRef = useRef(null);

  const loadImage = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setOriginal({ src: e.target.result, w: img.naturalWidth, h: img.naturalHeight, name: file.name, type: file.type, size: file.size });
        setWidth(String(img.naturalWidth));
        setHeight(String(img.naturalHeight));
        setPreview(null);
        setOutputSize(null);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleWidthChange = (val) => {
    const w = parseInt(val, 10);
    setWidth(val);
    if (keepRatio && original && !isNaN(w) && w > 0) {
      setHeight(String(Math.round(w * original.h / original.w)));
    }
  };
  const handleHeightChange = (val) => {
    const h = parseInt(val, 10);
    setHeight(val);
    if (keepRatio && original && !isNaN(h) && h > 0) {
      setWidth(String(Math.round(h * original.w / original.h)));
    }
  };

  const resize = useCallback(() => {
    if (!original) return;
    const w = Math.max(1, parseInt(width, 10) || original.w);
    const h = Math.max(1, parseInt(height, 10) || original.h);
    const canvas = canvasRef.current;
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, w, h);
      const q = format === 'image/png' ? 1 : quality / 100;
      const dataUrl = canvas.toDataURL(format, q);
      setPreview(dataUrl);
      // estimate output size
      const bytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
      setOutputSize(bytes);
    };
    img.src = original.src;
  }, [original, width, height, format, quality]);

  const download = () => {
    if (!preview) return;
    const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';
    const base = original.name.replace(/\.[^.]+$/, '');
    const a = document.createElement('a');
    a.href = preview;
    a.download = `${base}_${width}x${height}.${ext}`;
    a.click();
  };

  const fmtBytes = (b) => b >= 1048576 ? (b/1048576).toFixed(1)+' MB' : (b/1024).toFixed(0)+' KB';

  return (
    <div className="tool-container">
      <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-1">Image Resizer</h1>
      <p className="text-slate-500 mb-8 text-sm">Resize JPG, PNG or WebP images to any dimension. Convert format and adjust quality. 100% private — runs in your browser.</p>

      <div className="ad-slot h-20 mb-8">[ AdSense — Leaderboard ]</div>

      {/* Drop zone */}
      {!original ? (
        <div className={`drop-zone mb-6 ${dragging ? 'active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); loadImage(e.dataTransfer.files[0]); }}
          onClick={() => document.getElementById('img-input').click()}>
          <div className="text-4xl mb-3">🖼️</div>
          <p className="font-semibold text-slate-700">Drop an image here or <span className="text-brand-700 underline">browse</span></p>
          <p className="text-xs text-slate-400 mt-1">JPG · PNG · WebP · GIF · BMP — max 20 MB</p>
          <input id="img-input" type="file" accept="image/*" className="hidden"
            onChange={e => loadImage(e.target.files[0])} />
        </div>
      ) : (
        <div className="mb-6 flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
          <img src={original.src} alt="" className="w-12 h-12 object-cover rounded-lg border border-slate-100" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{original.name}</p>
            <p className="text-xs text-slate-400">{original.w} × {original.h} px · {fmtBytes(original.size)}</p>
          </div>
          <button onClick={() => { setOriginal(null); setPreview(null); }}
            className="text-xs text-red-500 hover:text-red-700 font-medium">Change</button>
        </div>
      )}

      {original && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
            {/* Dimensions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-700">Dimensions (px)</p>
                <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                  <input type="checkbox" checked={keepRatio} onChange={e => setKeepRatio(e.target.checked)} className="rounded" />
                  Lock aspect ratio
                </label>
              </div>
              <div className="flex gap-3 items-center">
                <div className="flex-1">
                  <label className="text-xs text-slate-500 mb-1 block">Width</label>
                  <input type="text" inputMode="numeric" value={width}
                    onChange={e => handleWidthChange(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
                <span className="text-slate-400 mt-4">×</span>
                <div className="flex-1">
                  <label className="text-xs text-slate-500 mb-1 block">Height</label>
                  <input type="text" inputMode="numeric" value={height}
                    onChange={e => handleHeightChange(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              </div>
              {/* Quick presets */}
              <div className="flex flex-wrap gap-2 mt-3">
                {[['HD', 1280, 720], ['FHD', 1920, 1080], ['Square', 800, 800], ['Thumb', 200, 200]].map(([label, w, h]) => (
                  <button key={label} onClick={() => { setKeepRatio(false); setWidth(String(w)); setHeight(String(h)); }}
                    className="px-3 py-1 text-xs bg-slate-100 hover:bg-brand-50 hover:text-brand-700 rounded-full text-slate-600 transition-colors">
                    {label} {w}×{h}
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Output Format</p>
              <div className="flex gap-2">
                {[['JPEG', 'image/jpeg'], ['PNG', 'image/png'], ['WebP', 'image/webp']].map(([label, val]) => (
                  <button key={val} onClick={() => setFormat(val)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors
                      ${format === val ? 'bg-brand-700 text-white border-brand-700' : 'text-slate-600 border-slate-200 hover:border-brand-300'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality (JPEG/WebP only) */}
            {format !== 'image/png' && (
              <div>
                <div className="flex justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-700">Quality</p>
                  <span className="text-sm font-bold text-brand-700">{quality}%</span>
                </div>
                <input type="range" min="10" max="100" step="5" value={quality}
                  onChange={e => setQuality(+e.target.value)} />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>Smaller file</span><span>Best quality</span>
                </div>
              </div>
            )}

            <button onClick={resize}
              className="w-full py-3 bg-brand-700 hover:bg-brand-800 text-white font-bold rounded-xl transition-colors">
              ✨ Resize Image
            </button>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            {preview ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-semibold text-slate-700">Preview</p>
                  <p className="text-xs text-slate-400">{width} × {height} px · {outputSize ? fmtBytes(outputSize) : ''}</p>
                </div>
                <img src={preview} alt="Preview" className="w-full rounded-lg object-contain max-h-64 bg-slate-50" />
                <button onClick={download}
                  className="mt-4 w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors">
                  ⬇️ Download Resized Image
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-center">
                <div className="text-4xl mb-3 opacity-30">🖼️</div>
                <p className="text-sm text-slate-400">Click "Resize Image" to see preview</p>
              </div>
            )}

            {/* Original vs output comparison */}
            {outputSize && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl border border-slate-100 p-3 text-center">
                  <p className="text-xs text-slate-500">Original</p>
                  <p className="font-bold text-slate-700 text-sm">{original.w}×{original.h}</p>
                  <p className="text-xs text-slate-400">{fmtBytes(original.size)}</p>
                </div>
                <div className="bg-white rounded-xl border border-green-200 bg-green-50 p-3 text-center">
                  <p className="text-xs text-green-600">Resized</p>
                  <p className="font-bold text-green-700 text-sm">{width}×{height}</p>
                  <p className="text-xs text-green-500">{fmtBytes(outputSize)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      <div className="mt-10 bg-slate-50 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">How to Resize Images</h2>
        <ol className="space-y-3">
          {['Upload any JPG, PNG or WebP image.', 'Enter your target width and height, or pick a preset. Enable "Lock aspect ratio" to avoid distortion.', 'Choose output format and quality, then click Resize. Download the result instantly.'].map((s, i) => (
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
            ['What image formats are supported?', 'You can upload JPG, PNG, WebP, GIF, and BMP images. Output can be JPEG, PNG, or WebP.'],
            ['Will resizing reduce quality?', 'Enlarging an image beyond its original size will reduce sharpness. Downscaling always looks clean. Use PNG for lossless output.'],
            ['Is there a file size limit?', 'We recommend keeping uploads under 20 MB for smooth performance in your browser.'],
            ['Are my images uploaded to a server?', 'No. Everything runs in your browser using the Canvas API. Your images never leave your device.'],
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
