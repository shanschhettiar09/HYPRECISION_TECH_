import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Shield,
  Layers,
  Sparkles,
  ZoomIn,
} from 'lucide-react';
import { ProductItem } from '../types.ts';

interface ProductDetailModalProps {
  product: ProductItem | null;
  onClose: () => void;
  onToggleCompare: (product: ProductItem) => void;
  isCompared: boolean;
  onRequestQuote: (product: ProductItem) => void;
  onViewFormalOffer?: (product: ProductItem) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onToggleCompare,
  isCompared,
  onRequestQuote,
  onViewFormalOffer,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!product) return null;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-0 overflow-hidden"
    >
      <div className="bg-[#18181B] w-full h-full flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#121215] text-white flex justify-between items-center shrink-0 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="mono text-[10px] font-bold text-[#FF6B52] bg-white/10 px-2 py-0.5 border border-white/10">
                {product.sku}
              </span>
              <span className="mono text-[10px] text-white/50">{product.category_name}</span>
            </div>
            <h3 className="font-editorial text-xl sm:text-2xl font-bold mt-1.5 text-white">
              {product.title}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white transition"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 text-xs bg-[#18181B] text-zinc-100">
          {/* Top Banner Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
            <div
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
              onMouseMove={handleMouseMove}
              className="sm:col-span-5 h-60 bg-[#121215] border border-white/15 overflow-hidden relative group cursor-crosshair select-none"
            >
              <img
                src={product.image_url}
                alt={product.title}
                style={{
                  transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                  transform: isZoomed ? 'scale(2.4)' : 'scale(1)',
                }}
                className="w-full h-full object-cover transition-transform duration-100 ease-out pointer-events-none"
              />

              {/* Inspection HUD indicator */}
              <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-xs text-white px-2 py-1 mono text-[9px] uppercase tracking-wider flex items-center gap-1 border border-white/10 pointer-events-none">
                {isZoomed ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B52] animate-pulse"></span>
                    <span className="text-[#FF6B52] font-bold">2.4x Zoom Active</span>
                  </>
                ) : (
                  <>
                    <ZoomIn size={11} className="text-[#FF6B52]" />
                    <span>Hover to Zoom</span>
                  </>
                )}
              </div>

              <div className="absolute bottom-2 left-2 bg-[#121215]/90 text-[#FF6B52] px-2 py-0.5 mono text-[9px] uppercase tracking-wider border border-[#FF6B52]/30 pointer-events-none flex items-center gap-1">
                <span>CAD Verified Inspection</span>
              </div>
            </div>

            <div className="sm:col-span-7 flex flex-col justify-between space-y-3">
              <div>
                <span className="label-bracket text-zinc-400">[01] Technical Overview</span>
                <p className="text-zinc-200 leading-relaxed text-xs mt-1">
                  {product.description || product.short_desc}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/10 bg-[#1E1E24] p-3">
                <div>
                  <span className="mono text-[9px] text-zinc-400 uppercase">Unit Price</span>
                  <div className="text-lg font-bold text-white font-editorial mt-0.5">
                    ${product.price_usd.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="mono text-[9px] text-zinc-400 uppercase">Stock Status</span>
                  <div className="mono text-[11px] font-bold text-zinc-100 mt-1">
                    {product.stock_quantity > 0
                      ? `${product.stock_quantity} in stock`
                      : 'Built to Order'}
                  </div>
                </div>
                <div>
                  <span className="mono text-[9px] text-zinc-400 uppercase">Lead Time</span>
                  <div className="mono text-[11px] font-bold text-zinc-100 mt-1">
                    {product.lead_time_days} days
                  </div>
                </div>
              </div>

              {/* Certifications list */}
              <div>
                <div className="mono text-[9px] uppercase font-bold text-zinc-400 mb-1 flex items-center gap-1">
                  <Shield size={11} className="text-[#FF6B52]" /> Testing & Certification Standards
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(product.certifications || ['ISO 9001:2015', 'CE', 'ASME VIII']).map((c, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-[#1E1E24] text-zinc-200 mono text-[10px] border border-white/10"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Full Specifications Table */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="label-bracket text-zinc-300">[02] Full Specifications Sheet</span>
            </div>
            <div className="border border-white/10 overflow-hidden bg-[#1E1E24] shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#121215] text-white mono text-[10px] uppercase border-b border-white/10">
                  <tr>
                    <th className="p-3 w-1/2">Parameter</th>
                    <th className="p-3">Specification / Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {product.specifications.map((s, idx) => (
                    <tr key={idx} className={s.highlight ? 'bg-[#FF6B52]/10' : 'hover:bg-white/5'}>
                      <td className="p-3 font-medium text-zinc-200 flex items-center justify-between">
                        <span>{s.key}</span>
                        {s.highlight && (
                          <span className="mono text-[9px] text-[#FF6B52] bg-[#FF6B52]/15 font-bold px-1.5 py-0.5 border border-[#FF6B52]/30 mr-2">
                            CRITICAL
                          </span>
                        )}
                      </td>
                      <td className="p-3 mono font-semibold text-white">
                        {s.value} {s.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-[#18181B] border-t border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => onToggleCompare(product)}
            className={`px-4 py-2 text-xs mono uppercase tracking-wider border transition cursor-pointer ${
              isCompared
                ? 'bg-[#FF6B52] text-white border-[#FF6B52] font-bold'
                : 'border-white/20 text-zinc-200 hover:border-white/40 hover:bg-white/5'
            }`}
          >
            {isCompared ? 'In Comparison Tray ✓' : '+ Add to Compare'}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {onViewFormalOffer && (
              <button
                onClick={() => {
                  onClose();
                  onViewFormalOffer(product);
                }}
                className="px-4 py-2 border border-[#FF6B52]/50 bg-[#FF6B52]/15 hover:bg-[#FF6B52] text-white text-xs mono uppercase tracking-wider font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="View authentic ISO 9001:2015 Techno-Commercial Offer document (as per HPT sample quotation)"
              >
                <Sparkles size={13} className="text-[#FF6B52] group-hover:text-white" />
                <span>Formal Quotation (PDF Offer)</span>
              </button>
            )}
            <button
              onClick={() => {
                onClose();
                onRequestQuote(product);
              }}
              className="px-5 py-2 bg-[#27272A] hover:bg-[#FF6B52] text-white border border-white/15 text-xs mono uppercase tracking-wider font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileSpreadsheet size={13} />
              <span>Submit RFQ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
