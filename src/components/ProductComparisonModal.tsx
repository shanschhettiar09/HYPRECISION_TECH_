import React, { useEffect, useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Award,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { ProductItem, AiComparisonResult } from '../types.ts';
import { buildProductComparisonMatrix } from '../utils/productLogic.ts';

interface ProductComparisonModalProps {
  products: ProductItem[];
  onClose: () => void;
  onRemoveProduct: (id: string) => void;
  onRequestQuote: (product: ProductItem) => void;
}

export const ProductComparisonModal: React.FC<ProductComparisonModalProps> = ({
  products,
  onClose,
  onRemoveProduct,
  onRequestQuote,
}) => {
  const [aiData, setAiData] = useState<AiComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localMatrix = buildProductComparisonMatrix(products);

  const fetchAiComparison = async () => {
    if (products.length < 2) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: products.map((p) => p.id) }),
      });

      if (!res.ok) {
        throw new Error('AI comparison service encountered an issue.');
      }

      const data = await res.json();
      setAiData(data);
    } catch (err: any) {
      console.warn('AI comparison fetch failed:', err);
      setError(err.message || 'Failed to complete AI comparison.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAiComparison();
  }, [products]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-0 overflow-hidden">
      <div className="bg-[#18181B] w-full h-full flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        {/* Architectural Header */}
        <div className="p-4 sm:p-5 bg-[#121215] text-white flex justify-between items-center shrink-0 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-[#FF6B52] border border-white/10">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-editorial text-xl sm:text-2xl font-bold tracking-tight">
                  Component Comparison Matrix
                </h3>
              </div>
              <p className="mono text-[10px] text-white/50 tracking-wider">
                Grounding side-by-side engineering tolerances & operational specs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAiComparison}
              disabled={loading || products.length < 2}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-mono transition cursor-pointer"
              title="Refresh AI Analysis"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin text-[#B8860B]' : ''} />
              <span>Regenerate</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-white/70 hover:text-white transition"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 bg-[#18181B] text-zinc-100">
          {/* 1. PRODUCT CARDS HEADER ROW */}
          <div
            className={`grid gap-4 ${
              products.length === 2
                ? 'grid-cols-1 sm:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-3'
            }`}
          >
            {products.map((prod) => (
              <div
                key={prod.id}
                className="bg-[#1E1E24] border border-white/10 p-4 flex flex-col justify-between relative shadow-xs text-zinc-100"
              >
                {products.length > 2 && (
                  <button
                    onClick={() => onRemoveProduct(prod.id)}
                    className="absolute top-2.5 right-2.5 p-1 text-zinc-400 hover:text-[#FF6B52] transition"
                    title="Remove from comparison"
                  >
                    <X size={15} />
                  </button>
                )}

                <div>
                  <div className="flex justify-between items-center">
                    <span className="mono text-[10px] font-bold text-[#FF6B52] bg-[#27272A] px-2 py-0.5 border border-white/10">
                      {prod.sku}
                    </span>
                    <span className="mono text-[9px] text-zinc-400">{prod.category_name}</span>
                  </div>

                  {/* Vessel Image with Hover Zoom */}
                  <div className="h-28 w-full bg-[#121215] border border-white/10 overflow-hidden relative my-2.5 group">
                    <img
                      src={prod.image_url}
                      alt={prod.title}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-120"
                    />
                  </div>

                  <h4 className="font-editorial text-base sm:text-lg font-bold text-white mb-1 leading-tight">
                    {prod.title}
                  </h4>
                  <div className="text-xl font-bold text-white font-editorial">
                    ${prod.price_usd.toLocaleString()}{' '}
                    <span className="mono text-[9px] text-zinc-400 font-normal">Ex-Works</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="mono text-[10px] text-zinc-400">Lead Time: {prod.lead_time_days}d</span>
                  <button
                    onClick={() => onRequestQuote(prod)}
                    className="px-2.5 py-1 bg-[#FF6B52] hover:bg-[#F0543B] text-white text-[10px] mono uppercase tracking-wider flex items-center gap-1 transition cursor-pointer"
                  >
                    <FileSpreadsheet size={11} /> Quote
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 2. AI ANALYSIS CARD */}
          <div className="bg-[#1E1E24] border border-white/10 p-5 shadow-xs text-zinc-100">
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2.5">
              <h4 className="font-editorial text-lg font-bold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-[#FF6B52]" />
                <span>Chrollo's Analysis</span>
              </h4>
              {loading && (
                <div className="flex items-center gap-1.5 mono text-[10px] text-[#FF6B52] animate-pulse">
                  <RefreshCw size={11} className="animate-spin" />
                  <span>Cross-referencing specs...</span>
                </div>
              )}
            </div>

            {aiData && !loading ? (
              <div className="space-y-4">
                <p className="text-xs text-zinc-200 leading-relaxed italic border-l-2 border-[#FF6B52] pl-3 py-1 bg-[#141417]">
                  "{aiData.summary}"
                </p>

                {/* Recommendations grid */}
                <div
                  className={`grid gap-3 ${
                    aiData.recommendations.length === 2
                      ? 'grid-cols-1 sm:grid-cols-2'
                      : 'grid-cols-1 sm:grid-cols-3'
                  }`}
                >
                  {aiData.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="bg-[#141417] border border-white/10 p-3.5 space-y-2 text-xs"
                    >
                      <div className="font-bold text-white mono text-xs flex items-center justify-between border-b border-white/10 pb-1.5">
                        <span>{rec.sku}</span>
                        <Award size={14} className="text-[#FF6B52]" />
                      </div>
                      <div className="text-[11px] text-zinc-300">
                        <strong className="text-white font-semibold">Optimal Use-Case:</strong> {rec.bestFor}
                      </div>

                      <div>
                        <div className="mono text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle size={10} /> Strengths:
                        </div>
                        <ul className="list-disc list-inside text-[11px] text-zinc-300 pl-1 space-y-0.5">
                          {rec.pros.map((p, idx) => (
                            <li key={idx}>{p}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <div className="mono text-[10px] font-bold text-amber-400 flex items-center gap-1">
                          <AlertCircle size={10} /> Considerations:
                        </div>
                        <ul className="list-disc list-inside text-[11px] text-zinc-300 pl-1 space-y-0.5">
                          {rec.cons.map((c, idx) => (
                            <li key={idx}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : loading ? (
              <div className="py-8 text-center text-xs text-zinc-400 space-y-2">
                <RefreshCw size={24} className="animate-spin text-[#FF6B52] mx-auto" />
                <p className="mono text-[11px]">Evaluating pressure tolerances and metallurgy criteria...</p>
              </div>
            ) : (
              <div className="text-xs text-zinc-400 py-3 mono">
                Select at least 2 items to view comparative engineering recommendations.
              </div>
            )}
          </div>

          {/* 3. RELATIONAL SPECIFICATION COMPARISON MATRIX TABLE */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="label-bracket text-zinc-300">[04] Technical Matrix</span>
            </div>

            <div className="border border-white/10 overflow-hidden bg-[#1E1E24] shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#121215] text-white border-b border-white/10">
                    <tr>
                      <th className="p-3 font-medium w-1/3 mono text-[10px] uppercase tracking-wider">
                        Parameter / Specification
                      </th>
                      {products.map((p) => (
                        <th key={p.id} className="p-3 mono font-bold text-[11px] text-[#FF6B52]">
                          {p.sku}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {/* Common Price & Stock row */}
                    <tr className="bg-[#232329] font-medium">
                      <td className="p-3 text-zinc-200 font-semibold">Unit Price (FOB)</td>
                      {products.map((p) => (
                        <td key={p.id} className="p-3 text-white font-editorial text-sm font-bold">
                          ${p.price_usd.toLocaleString()} USD
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-[#1B1B20]">
                      <td className="p-3 text-zinc-300">Stock Availability</td>
                      {products.map((p) => (
                        <td key={p.id} className="p-3 text-zinc-100 mono text-[11px]">
                          {p.stock_quantity > 0
                            ? `${p.stock_quantity} units available`
                            : 'Made to Order'}
                        </td>
                      ))}
                    </tr>

                    {/* Dynamic Specs Rows */}
                    {localMatrix.rows.map((row, i) => (
                      <tr
                        key={i}
                        className={
                          row.isDifferent ? 'bg-[#FF6B52]/10 font-medium' : 'hover:bg-white/5'
                        }
                      >
                        <td className="p-3 text-zinc-200 flex items-center justify-between">
                          <span>{row.specKey}</span>
                          {row.isDifferent && (
                            <span className="mono text-[9px] text-[#FF6B52] bg-[#FF6B52]/15 font-bold px-1.5 py-0.5 border border-[#FF6B52]/30">
                              DIFF
                            </span>
                          )}
                        </td>
                        {products.map((p) => (
                          <td key={p.id} className="p-3 text-zinc-100 mono text-[11px]">
                            {row.values[p.id] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#18181B] border-t border-white/10 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#27272A] hover:bg-[#FF6B52] text-white border border-white/15 text-xs mono uppercase tracking-wider transition cursor-pointer"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
};
