import React from 'react';
import { Database, ShieldCheck } from 'lucide-react';
import { StaggerBlock } from './RevealEffects.tsx';

interface FooterProps {
  onSelectCategory: (category: string) => void;
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectCategory, onOpenAdmin }) => {
  return (
    <footer className="relative z-10 mt-16 bg-[#071326]/90 backdrop-blur-md text-[#D6CFC0] text-xs pt-14 pb-12 border-t border-[#FAF5EA]/15 border-b-4 border-b-[#FF6B52]">
      <StaggerBlock delay={1650} fromY={20}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-8 h-8 rounded-md bg-[#FAF5EA] overflow-hidden border border-[#FAF5EA]/25 flex items-center justify-center shrink-0">
                  <img
                    src="/assets/aistudio/WhatsApp_Image_2026-11-22_at_22.16.21_ef25e50b.jpeg"
                    alt="Hy-Precision Technology Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-sm font-bold text-[#FAF5EA]">
                  HY PRECISION TECHNOLOGIES
                </div>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-[#FF6B52] font-semibold mb-2">
                MARINE &amp; OFFSHORE SYSTEMS // 2026
              </div>
              <p className="text-xs leading-relaxed text-[#D6CFC0]">
                Joint Venture partner with Euro Offshore Group. Specialized naval patrol vessels, ASD escort tugboats, indestructible HDPE workboats, and SOLAS lifesaving systems.
              </p>
            </div>

            <div>
              <div className="text-[11px] font-bold text-[#FAF5EA] uppercase tracking-wider mb-2">
                Vessel Divisions
              </div>
              <ul className="space-y-1.5 text-xs text-[#D6CFC0]">
                <li>
                  <button onClick={() => onSelectCategory('governmental-military')} className="hover:text-[#FF6B52] transition-colors duration-150 cursor-pointer">
                    • Fast Attack Patrol 2380 &amp; USV 5.60
                  </button>
                </li>
                <li>
                  <button onClick={() => onSelectCategory('alunautic-aluminium')} className="hover:text-[#FF6B52] transition-colors duration-150 cursor-pointer">
                    • Alunautic Aluminium Landing Crafts
                  </button>
                </li>
                <li>
                  <button onClick={() => onSelectCategory('blue-spirit-ribs')} className="hover:text-[#FF6B52] transition-colors duration-150 cursor-pointer">
                    • Blue Spirit GRP Tactical RHIBs
                  </button>
                </li>
                <li>
                  <button onClick={() => onSelectCategory('hdpe-workboats')} className="hover:text-[#FF6B52] transition-colors duration-150 cursor-pointer">
                    • HDPE Indestructible Hull Workboats
                  </button>
                </li>
                <li>
                  <button onClick={() => onSelectCategory('eo-lifesaving')} className="hover:text-[#FF6B52] transition-colors duration-150 cursor-pointer">
                    • EO Lifeboats &amp; Hydraulic Davits
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <div className="text-[11px] font-bold text-[#FAF5EA] uppercase tracking-wider mb-2">
                Locations &amp; Facilities
              </div>
              <div className="space-y-1 text-xs text-[#D6CFC0]">
                <p><strong className="text-[#FAF5EA]">India Works:</strong> Renaissance Infrastructure Park, Unit 4, Vashere, Thane, MH 421301</p>
                <p><strong className="text-[#FAF5EA]">Europe Yard:</strong> Euro Offshore B.V., Beatrixhaven, Werkendam, Netherlands</p>
                <p><strong className="text-[#FAF5EA]">Norway Partner:</strong> Northbay Shipyards, Norway</p>
                <p className="text-[10px] text-[#FF6B52] font-semibold pt-1 flex items-center gap-1">
                  <ShieldCheck size={12} /> ISO 9001:2015 &amp; IMO / SOLAS Certified
                </p>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold text-[#FAF5EA] uppercase tracking-wider mb-2">
                Commercial &amp; Sales Inquiries
              </div>
              <div className="space-y-1 text-xs text-[#FAF5EA] font-mono">
                <p>sales@hyprecisiontechnology.com</p>
                <p>+91 70836 78003</p>
                <p>+91 900470 9634</p>
                <p className="text-[11px] text-[#D6CFC0] font-sans pt-1">
                  Techno-Commercial Quotations generated with 30/30/30/10 milestone schedules.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-[#FAF5EA]/12 text-xs text-[#D6CFC0]">
            <div>
              © 2026 HY Precision Technologies. Naval Engineering Catalogue · IMO &amp; IACS Standards.
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onOpenAdmin}
                className="text-[#D6CFC0] hover:text-[#FF6B52] flex items-center gap-1 cursor-pointer font-medium transition-colors duration-150"
              >
                <Database size={13} />
                <span>Admin Inventory Console</span>
              </button>
            </div>
          </div>
        </div>
      </StaggerBlock>
    </footer>
  );
};

