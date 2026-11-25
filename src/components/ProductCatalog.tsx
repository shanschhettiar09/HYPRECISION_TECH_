import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  ArrowRight,
  Package,
  X,
  Filter,
  Check,
} from 'lucide-react';
import { ProductItem } from '../types.ts';
import { filterAndSortProducts, FilterOptions } from '../utils/productLogic.ts';
import { StaggerBlock } from './RevealEffects.tsx';

interface ProductCatalogProps {
  products: ProductItem[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  selectedForCompare: ProductItem[];
  onToggleCompare: (product: ProductItem) => void;
  onOpenCompareModal: () => void;
  onClearCompare: () => void;
  onViewProductDetail: (product: ProductItem) => void;
  onRequestQuote: (product: ProductItem) => void;
  onViewFormalOffer?: (product: ProductItem) => void;
  externalSearch?: string;
  onResetSearch?: () => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  selectedCategory,
  onSelectCategory,
  selectedForCompare,
  onToggleCompare,
  onViewProductDetail,
  onRequestQuote,
  externalSearch = '',
  onResetSearch,
}) => {
  const [searchTerm, setSearchTerm] = useState(externalSearch);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<FilterOptions['sortBy']>('sku');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number | undefined>(undefined);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  useEffect(() => {
    if (externalSearch !== undefined) {
      setSearchTerm(externalSearch);
    }
  }, [externalSearch]);

  const filtered = filterAndSortProducts(products, {
    categorySlug: selectedCategory,
    searchTerm,
    inStockOnly,
    sortBy,
    maxPrice: maxPriceFilter,
  });

  const categoriesList = [
    { slug: 'all', label: 'All Fleet & Systems' },
    { slug: 'governmental-military', label: 'Governmental & Defense' },
    { slug: 'alunautic-aluminium', label: 'Alunautic Aluminium' },
    { slug: 'blue-spirit-ribs', label: 'Blue Spirit RIBs' },
    { slug: 'fibre-shark-grp', label: 'Fibre Shark GRP' },
    { slug: 'hdpe-workboats', label: 'HDPE Indestructible' },
    { slug: 'eo-lifesaving', label: 'EO Lifesaving & Davits' },
    { slug: 'aquacat-catamarans', label: 'AquaCat Catamarans' },
  ];

  return (
    <section id="fleet-catalogue" className="pt-4 pb-16">
      {/* Section Header */}
      <StaggerBlock delay={1520}>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-[#FF6B52] uppercase tracking-wider">
                [ Fleet Catalogue &amp; Specifications ]
              </span>
              <span className="text-xs text-[#FAF5EA]/35">·</span>
              <span className="text-xs text-[#D6CFC0] font-medium">IMO &amp; IACS Verified</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#FAF5EA] tracking-tight">
              Specialized Vessels &amp; Engineering Systems
            </h2>
            <p className="text-xs sm:text-sm text-[#D6CFC0] mt-1">
              Displaying <span className="font-bold text-[#FAF5EA]">{filtered.length}</span> verified platforms with full technical parameters and certified drawings.
            </p>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 text-[#526079]" size={15} />
              <input
                type="text"
                placeholder="Search SKU, vessel, engine..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-8 py-2 bg-[#FAF5EA] border border-[#E5DEC9] rounded-lg text-xs text-[#091830] placeholder-[#6B768B] focus:outline-none focus:border-[#FF6B52] focus:ring-1 focus:ring-[#FF6B52] transition"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    if (onResetSearch) onResetSearch();
                  }}
                  className="absolute right-2.5 top-2.5 text-[#526079] hover:text-[#091830] cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as FilterOptions['sortBy'])}
              className="px-3 py-2 bg-[#FAF5EA] border border-[#E5DEC9] rounded-lg text-xs text-[#091830] font-medium focus:outline-none focus:border-[#FF6B52] cursor-pointer"
            >
              <option value="sku">Sort: SKU Code</option>
              <option value="name">Sort: Vessel Name</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="stock">Inventory Availability</option>
            </select>

            <button
              onClick={() => setShowFiltersMobile(!showFiltersMobile)}
              className="md:hidden px-3 py-2 bg-[#FAF5EA] border border-[#E5DEC9] rounded-lg text-[#091830] text-xs font-semibold flex items-center gap-1.5"
            >
              <Filter size={13} /> Filters
            </button>
          </div>
        </div>
      </StaggerBlock>

      {/* Filter Ribbon with Category Pills — 30% Cream surface */}
      <StaggerBlock delay={1580}>
        <div
          className={`bg-[#FAF5EA] border border-[#E5DEC9] rounded-2xl p-3.5 sm:p-4 mb-8 shadow-lg text-[#091830] ${
            showFiltersMobile ? 'block' : 'hidden md:block'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-[#526079] uppercase tracking-wider mr-1">
                FLEET DIVISION:
              </span>
              {categoriesList.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => onSelectCategory(cat.slug)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    selectedCategory === cat.slug
                      ? 'bg-[#FF6B52] text-[#FAF5EA] shadow-xs font-semibold'
                      : 'bg-[#F1EADA] hover:bg-[#E7DEC9] text-[#1E3250] border border-[#E0D6C0]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Secondary Filter Controls */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[#091830] font-medium">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="accent-[#FF6B52] h-3.5 w-3.5"
                />
                <span>In-Stock / Ready Hull</span>
              </label>

              <div className="flex items-center gap-1.5 text-[#3B4963]">
                <span className="font-mono text-[11px]">Max Price:</span>
                <select
                  value={maxPriceFilter || ''}
                  onChange={(e) =>
                    setMaxPriceFilter(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="px-2.5 py-1 bg-[#F2EBD9] border border-[#E0D6C0] rounded-lg text-xs text-[#091830] cursor-pointer focus:outline-none focus:border-[#FF6B52]"
                >
                  <option value="">Any</option>
                  <option value="100000">&lt; $100,000</option>
                  <option value="300000">&lt; $300,000</option>
                  <option value="1000000">&lt; $1,000,000</option>
                  <option value="3000000">&lt; $3,000,000</option>
                </select>
              </div>

              {(searchTerm || inStockOnly || maxPriceFilter || selectedCategory !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setInStockOnly(false);
                    setMaxPriceFilter(undefined);
                    onSelectCategory('all');
                    if (onResetSearch) onResetSearch();
                  }}
                  className="text-xs text-[#E85738] hover:text-[#FF6B52] font-bold hover:underline cursor-pointer"
                >
                  RESET FILTERS
                </button>
              )}
            </div>
          </div>
        </div>
      </StaggerBlock>

      {/* Product Grid */}
      {filtered.length === 0 ? (
        <div className="bg-[#FAF5EA] border border-[#E5DEC9] rounded-2xl p-12 text-center max-w-md mx-auto my-8 shadow-lg text-[#091830]">
          <Package size={36} className="text-[#526079]/50 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-[#091830] mb-1">No matching vessels found</h3>
          <p className="text-xs text-[#3B4963] mb-4">
            Try adjusting your search criteria or query Chrollo for fleet guidance.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setInStockOnly(false);
              setMaxPriceFilter(undefined);
              onSelectCategory('all');
              if (onResetSearch) onResetSearch();
            }}
            className="px-5 py-2.5 bg-[#FF6B52] hover:bg-[#E85738] text-[#FAF5EA] font-semibold text-xs rounded-full transition cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((product) => {
            const isCompared = selectedForCompare.some((p) => p.id === product.id);
            const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;
            const isOutOfStock = product.stock_quantity === 0;

            return (
              <div
                key={product.id}
                className="relative bg-[#FAF5EA] border border-[#E5DEC9] rounded-2xl overflow-hidden hover:border-[#FF6B52] hover:shadow-xl transition-all duration-300 flex flex-col justify-between group text-[#091830] shadow-lg"
              >
                <div>
                  {/* Top Image Box */}
                  <div
                    className="relative aspect-[16/10] bg-[#0D213F] overflow-hidden cursor-pointer"
                    onClick={() => onViewProductDetail(product)}
                  >
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-[cubic-bezier(0.2,0,0,1)]"
                      loading="lazy"
                    />
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-[#091830]/85 backdrop-blur-xs text-[10px] font-mono text-[#FAF5EA] font-semibold uppercase z-10 border border-[#FAF5EA]/15">
                      {product.sku}
                    </div>

                    <div className="absolute top-2.5 right-2.5 z-10">
                      {isOutOfStock ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#091830]/85 backdrop-blur-xs text-[10px] font-mono text-[#D6CFC0] font-semibold border border-[#FAF5EA]/15">
                          BUILT TO ORDER
                        </span>
                      ) : isLowStock ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#FF6B52] text-[10px] font-mono text-[#FAF5EA] font-bold">
                          AVAILABLE ({product.stock_quantity})
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#091830]/90 text-[10px] font-mono text-[#FAF5EA] font-semibold border border-[#FAF5EA]/20">
                          READY STOCK ({product.stock_quantity})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5">
                    {/* Category Label */}
                    <div className="text-[11px] font-bold text-[#E85738] uppercase tracking-wider mb-1">
                      {product.category_name}
                    </div>

                    <h3
                      onClick={() => onViewProductDetail(product)}
                      className="text-base sm:text-lg font-bold text-[#091830] leading-snug hover:text-[#E85738] transition-colors cursor-pointer line-clamp-1"
                      title={product.title}
                    >
                      {product.title}
                    </h3>

                    <p className="text-xs text-[#3B4963] mt-1.5 leading-relaxed line-clamp-2">
                      {product.short_desc}
                    </p>

                    {/* Highlighted Specifications */}
                    {product.specifications && product.specifications.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-[#E4DBC7] grid grid-cols-2 gap-2 text-xs">
                        {product.specifications
                          .filter((s) => s.highlight)
                          .slice(0, 4)
                          .map((spec, i) => (
                            <div key={i} className="bg-[#F2EBD9] rounded-lg p-2 border border-[#E4DBC7]">
                              <div className="text-[9px] uppercase tracking-wider text-[#526079] font-mono truncate">
                                {spec.key}
                              </div>
                              <div className="text-xs font-bold text-[#091830] truncate mt-0.5 font-mono">
                                {spec.value} {spec.unit}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Price & Actions */}
                <div className="px-5 pb-5 pt-3 border-t border-[#E4DBC7] flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-mono text-[#526079] uppercase">FOB UNIT PRICE</div>
                    <div className="text-sm sm:text-base font-bold text-[#E85738] font-mono">
                      ${product.price_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onToggleCompare(product)}
                      className={`p-2 rounded-full border text-xs font-medium transition cursor-pointer ${
                        isCompared
                          ? 'border-[#FF6B52] bg-[#FF6B52]/12 text-[#E85738]'
                          : 'border-[#D9D0BA] bg-[#F2EBD9] hover:bg-[#E7DEC9] text-[#091830]'
                      }`}
                      title={isCompared ? 'Remove from compare' : 'Add to compare'}
                    >
                      {isCompared ? <Check size={14} className="text-[#E85738]" /> : <Plus size={14} />}
                    </button>

                    <button
                      onClick={() => onViewProductDetail(product)}
                      className="px-3.5 py-2 rounded-full border border-[#D9D0BA] bg-[#F2EBD9] hover:bg-[#E7DEC9] text-[#091830] text-xs font-semibold transition cursor-pointer"
                    >
                      Specs
                    </button>

                    <button
                      onClick={() => onRequestQuote(product)}
                      className="px-3.5 py-2 rounded-full bg-[#091830] hover:bg-[#FF6B52] text-[#FAF5EA] text-xs font-bold transition-colors duration-200 cursor-pointer flex items-center gap-1"
                    >
                      <span>Quote</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

