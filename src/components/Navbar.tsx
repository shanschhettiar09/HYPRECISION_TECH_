import React, { useState, useEffect } from 'react';
import {
  Bot,
  Menu,
  X,
  Database,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'overview' | 'catalogue' | 'compare' | 'ai' | 'commercial';
  onSelectTab: (tab: 'overview' | 'catalogue' | 'compare' | 'ai' | 'commercial') => void;
  compareCount: number;
  onOpenCompare: () => void;
  onOpenAi: () => void;
  onOpenRfq: () => void;
  onOpenAdmin: () => void;
  dbHealthy: boolean;
  totalProducts: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  compareCount,
  onOpenCompare,
  onOpenAi,
  onOpenRfq,
  onOpenAdmin,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setRevealed(true);
      return;
    }
    const raf = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 bg-[#091830]/75 backdrop-blur-md border-b border-[#FAF5EA]/12"
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(-0.75rem)',
        transition: 'opacity 700ms cubic-bezier(0.2, 0, 0, 1) 150ms, transform 700ms cubic-bezier(0.2, 0, 0, 1) 150ms',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none group"
          onClick={() => onSelectTab('overview')}
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-[#FAF5EA] overflow-hidden border border-[#FAF5EA]/30 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-11-22_at_22.16.21_ef25e50b.jpeg"
              alt="Hy-Precision Technology Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="text-sm sm:text-base font-bold tracking-tight text-[#FAF5EA] leading-tight">
              HY PRECISION TECHNOLOGIES
            </div>
            <div className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-[#FF6B52] uppercase">
              MARINE &amp; OFFSHORE SYSTEMS
            </div>
          </div>
        </div>

        {/* Center: Flowstate-inspired Glass Link Pill */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-7 h-11 rounded-full border border-[#FAF5EA]/18 bg-[#FAF5EA]/8 backdrop-blur-md px-6 text-sm">
          <button
            onClick={() => onSelectTab('overview')}
            className={`transition-colors duration-150 cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'text-[#FF6B52] font-semibold'
                : 'text-[#D6CFC0] hover:text-[#FAF5EA] font-medium'
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => onSelectTab('catalogue')}
            className={`transition-colors duration-150 cursor-pointer whitespace-nowrap ${
              activeTab === 'catalogue'
                ? 'text-[#FF6B52] font-semibold'
                : 'text-[#D6CFC0] hover:text-[#FAF5EA] font-medium'
            }`}
          >
            Catalogue
          </button>

          <button
            onClick={() => {
              onSelectTab('compare');
              onOpenCompare();
            }}
            className={`transition-colors duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'compare'
                ? 'text-[#FF6B52] font-semibold'
                : 'text-[#D6CFC0] hover:text-[#FAF5EA] font-medium'
            }`}
          >
            <span>Compare</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#FF6B52] text-[#FAF5EA] text-[11px] font-bold">
              {compareCount > 0 ? compareCount : 2}
            </span>
          </button>

          <button
            onClick={() => onSelectTab('commercial')}
            className={`transition-colors duration-150 cursor-pointer whitespace-nowrap ${
              activeTab === 'commercial'
                ? 'text-[#FF6B52] font-semibold'
                : 'text-[#D6CFC0] hover:text-[#FAF5EA] font-medium'
            }`}
          >
            Commercial Sales
          </button>
        </nav>

        {/* Right: Cream Chrollo pill + Coral Request Quote pill */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenAi}
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#FF6B52] bg-[#FF6B52] hover:bg-[#F0543B] text-[#FAF5EA] text-xs font-semibold shadow-sm transition-colors duration-150 cursor-pointer"
          >
            <Bot size={15} className="text-[#FAF5EA]" />
            <span>Chrollo</span>
          </button>

          <button
            onClick={onOpenRfq}
            className="px-4 sm:px-5 py-2 rounded-full bg-[#FF6B52] hover:bg-[#F0543B] text-[#FAF5EA] text-xs sm:text-sm font-semibold shadow-sm transition-colors duration-150 cursor-pointer"
          >
            Request Quote
          </button>

          <button
            onClick={onOpenAdmin}
            title="Database Console"
            className="p-2 rounded-full text-[#D6CFC0] hover:text-[#FAF5EA] hover:bg-[#FAF5EA]/10 transition-colors cursor-pointer"
            aria-label="Open Admin Database"
          >
            <Database size={16} />
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#FAF5EA] hover:bg-[#FAF5EA]/10 transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#FAF5EA]/15 bg-[#091830]/95 backdrop-blur-md px-4 py-4 space-y-2 shadow-lg">
          <button
            onClick={() => {
              onSelectTab('overview');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'overview' ? 'bg-[#FF6B52]/15 text-[#FF6B52] font-bold' : 'text-[#FAF5EA]'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => {
              onSelectTab('catalogue');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'catalogue' ? 'bg-[#FF6B52]/15 text-[#FF6B52] font-bold' : 'text-[#FAF5EA]'
            }`}
          >
            Catalogue
          </button>
          <button
            onClick={() => {
              onOpenCompare();
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-[#FAF5EA] flex items-center justify-between"
          >
            <span>Compare Fleet</span>
            <span className="px-2 py-0.5 rounded-full bg-[#FF6B52] text-[#FAF5EA] text-xs font-bold">
              {compareCount}
            </span>
          </button>
          <button
            onClick={() => {
              onOpenAi();
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-[#FAF5EA] flex items-center gap-2"
          >
            <Bot size={15} className="text-[#FF6B52]" />
            <span>Chrollo Engineering Copilot</span>
          </button>
          <button
            onClick={() => {
              onSelectTab('commercial');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-[#FAF5EA]"
          >
            Commercial Sales &amp; ISO Quotations
          </button>
        </div>
      )}
    </header>
  );
};
