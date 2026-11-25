import React, { useState } from 'react';
import {
  Search,
  Bot,
} from 'lucide-react';
import { ProductItem } from '../types.ts';
import { WordReveal, StaggerBlock } from './RevealEffects.tsx';

interface HeroSectionProps {
  onSearch: (query: string) => void;
  onOpenAi: (initialPrompt?: string) => void;
  onOpenRfq: (product?: ProductItem) => void;
  onInspectFlagship: (sku: string) => void;
  flagshipProduct?: ProductItem;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSearch,
  onOpenAi,
  onInspectFlagship,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    onSearch(searchQuery.trim());
  };

  const popularQueries = [
    { label: 'Tugboats', query: 'tugboat ASD 80t' },
    { label: 'Engines under $300k', query: 'engine under 300000' },
    { label: 'Bollard Pull Guide', query: 'bollard pull 80t' },
  ];

  return (
    <div className="pt-4 pb-12">
      {/* 1. Glass Badge Pill (Flowstate 320ms stagger) */}
      <StaggerBlock delay={320} fromY={20}>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#FAF5EA]/20 bg-[#FAF5EA]/8 backdrop-blur-md px-3.5 py-1.5 text-[11px] uppercase tracking-wider font-medium mb-5 sm:mb-7">
          <span className="text-[#FF6B52] font-semibold">HY PRECISION TECHNOLOGIES</span>
          <span className="text-[#FAF5EA]/30">·</span>
          <span className="text-[#D6CFC0]">Naval Engineering Catalogue</span>
          <span className="text-[#FAF5EA]/30 hidden sm:inline">·</span>
          <span className="text-[#D6CFC0] hidden sm:inline">IMO &amp; IACS Standards</span>
        </div>
      </StaggerBlock>

      {/* 2. Main Hero Layout (Two Columns on Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left Column: Word-by-word Heading & Sub-line, Glass Search Pill, Metrics */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.35rem] font-medium text-[#FAF5EA] leading-[1.1] tracking-tight">
              <WordReveal
                lines={[
                  'Specialized Workboats &',
                  'Precision Marine Propulsion',
                  'Systems.',
                ]}
                delay={480}
                stagger={85}
                duration={720}
                fromY={26}
              />
            </h1>

            <p className="mt-4 sm:mt-5 text-sm sm:text-base text-[#D6CFC0] max-w-xl leading-relaxed">
              <WordReveal
                lines={[
                  'Explore high-performance ASD escort tugs, fast aluminium crew vessels, self-righting pilot cutters, and heavy marine diesels. Compare verified technical specifications and query Chrollo.',
                ]}
                delay={1150}
                stagger={22}
                duration={600}
                fromY={14}
              />
            </p>

            {/* Glass Search Bar matching Flowstate form pill at 1450ms delay */}
            <StaggerBlock delay={1450} fromY={20}>
              <form onSubmit={handleSearchSubmit} className="mt-6 sm:mt-8 max-w-xl">
                <div className="bg-[#FAF5EA]/10 backdrop-blur-md border border-[#FAF5EA]/22 rounded-full p-1.5 pl-4 flex items-center shadow-sm focus-within:border-[#FF6B52] focus-within:ring-2 focus-within:ring-[#FF6B52]/25 transition-all">
                  <Search size={18} className="text-[#D6CFC0] mr-2.5 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search vessels, bollard pull, models (e.g. 'ASD tug 80t')..."
                    className="w-full bg-transparent text-xs sm:text-sm text-[#FAF5EA] placeholder:text-[#D6CFC0]/75 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="shrink-0 bg-[#FF6B52] hover:bg-[#F0543B] text-[#FAF5EA] font-semibold text-xs sm:text-sm px-4 sm:px-5 py-2.5 rounded-full transition-colors duration-150 cursor-pointer"
                  >
                    Search Fleet
                  </button>
                </div>

                {/* Popular Queries */}
                <div className="flex items-center gap-1.5 text-xs text-[#D6CFC0] mt-3 flex-wrap pl-2">
                  <span className="font-medium text-[#FAF5EA]/70">Popular queries:</span>
                  {popularQueries.map((item, idx) => (
                    <React.Fragment key={idx}>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery(item.label);
                          onSearch(item.query);
                        }}
                        className="text-[#FAF5EA]/85 hover:text-[#FF6B52] font-medium underline underline-offset-2 decoration-[#FAF5EA]/30 hover:decoration-[#FF6B52] transition-colors cursor-pointer"
                      >
                        {item.label}
                      </button>
                      {idx < popularQueries.length - 1 && (
                        <span className="text-[#FAF5EA]/30">·</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </form>
            </StaggerBlock>
          </div>

          {/* Metrics Strip */}
          <StaggerBlock delay={1450} fromY={20}>
            <div className="grid grid-cols-3 gap-4 pt-8 sm:pt-10 mt-6 border-t border-[#FAF5EA]/15 max-w-xl">
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-[#FAF5EA] tracking-tight font-mono">
                  80 t
                </div>
                <div className="text-[10px] sm:text-[11px] font-semibold text-[#D6CFC0] uppercase tracking-wider font-mono mt-0.5">
                  MAX BOLLARD PULL
                </div>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-bold text-[#FF6B52] tracking-tight font-mono">
                  2,400 kW
                </div>
                <div className="text-[10px] sm:text-[11px] font-semibold text-[#D6CFC0] uppercase tracking-wider font-mono mt-0.5">
                  PEAK ENGINE POWER
                </div>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-bold text-[#FAF5EA] tracking-tight font-mono">
                  IMO III
                </div>
                <div className="text-[10px] sm:text-[11px] font-semibold text-[#D6CFC0] uppercase tracking-wider font-mono mt-0.5">
                  SCR EMISSIONS
                </div>
              </div>
            </div>
          </StaggerBlock>
        </div>

        {/* Right Column: Warm Cream Flagship Showcase Card sitting cleanly over Navy Fluid */}
        <StaggerBlock delay={1450} fromY={20} className="lg:col-span-5">
          <div className="bg-[#FAF5EA] text-[#091830] rounded-2xl border border-[#E5DEC9] shadow-2xl p-3.5 flex flex-col justify-between transition-shadow duration-300 hover:shadow-[#091830]/60">
            <div className="relative rounded-xl overflow-hidden aspect-[16/10] bg-[#0D213F] group">
              <img
                src="/images/products/flagship_stormtug_80.jpg"
                alt="StormTug 80 (ST-80) Flagship ASD Escort Tug"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            <div className="pt-3 px-1">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-[#E85738] uppercase tracking-wider text-[11px]">
                  Flagship Showcase
                </span>
                <span className="text-[#475569] text-xs">
                  Northbay Shipyards · Norway
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2 mt-1">
                <h3 className="text-base sm:text-lg font-bold text-[#091830] leading-tight">
                  StormTug 80 (ST-80)
                </h3>
                <span className="text-base sm:text-lg font-bold text-[#E85738] font-mono">
                  $6,800,000
                </span>
              </div>

              <p className="text-xs text-[#3B4963] mt-1.5 leading-relaxed">
                Escort and towing tug with high bollard pull (80t) and twin ASD azimuth propulsion.
              </p>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#E5DEC9] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => onInspectFlagship('ST-80-TUG')}
                  className="group/inspect text-[#E85738] hover:text-[#C84124] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Inspect Specifications</span>
                  <span
                    aria-hidden="true"
                    className="inline-block transition-transform duration-150 group-hover/inspect:translate-x-1"
                  >
                    &rarr;
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onOpenAi(
                      'Give me a detailed technical summary of the StormTug 80 (ST-80), its 80-tonne bollard pull curve, ASD azimuth thruster configuration, and fuel consumption.'
                    )
                  }
                  className="text-[#475569] hover:text-[#091830] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Bot size={14} className="text-[#FF6B52]" />
                  <span>Ask Chrollo</span>
                </button>
              </div>
            </div>
          </div>
        </StaggerBlock>
      </div>
    </div>
  );
};

