import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { HeroSection } from './components/HeroSection.tsx';
import { ProductCatalog } from './components/ProductCatalog.tsx';
import { ProductComparisonModal } from './components/ProductComparisonModal.tsx';
import { AiAssistantModal } from './components/AiAssistantModal.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { ProductDetailModal } from './components/ProductDetailModal.tsx';
import { RfqModal } from './components/RfqModal.tsx';
import { FormalQuotationModal } from './components/FormalQuotationModal.tsx';
import { Footer } from './components/Footer.tsx';
import { ProductItem, CategoryItem, FormalQuotationOffer } from './types.ts';
import { generateFormalQuotationOffer } from './utils/quotationDocument.ts';
import { FluidBackdrop } from './components/FluidBackdrop.tsx';
import { startSmoothScroll, setSmoothScrollPaused } from './utils/motionEngine.ts';

export default function App() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedForCompare, setSelectedForCompare] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbHealthy, setDbHealthy] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'catalogue' | 'compare' | 'ai' | 'commercial'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | undefined>(undefined);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [rfqModalOpen, setRfqModalOpen] = useState(false);
  const [activeRfqProduct, setActiveRfqProduct] = useState<ProductItem | null>(null);
  const [detailProduct, setDetailProduct] = useState<ProductItem | null>(null);
  const [formalOfferData, setFormalOfferData] = useState<FormalQuotationOffer | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  // Fetch live products and categories from backend (passing adminToken when unlocked)
  const fetchData = async (tokenOverride?: string | null) => {
    const activeToken = tokenOverride !== undefined ? tokenOverride : adminToken;
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/products', {
          headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
        }),
        fetch('/api/categories'),
      ]);

      if (prodRes.ok) {
        const prodData: ProductItem[] = await prodRes.json();
        setProducts(prodData);
        setDbHealthy(true);

        if (!activeToken) {
          setSelectedForCompare((prev) =>
            prev.filter((item) => item.category_slug !== 'governmental-military')
          );
          setDetailProduct((prev) =>
            prev?.category_slug === 'governmental-military' ? null : prev
          );
        }

        // Pre-select 2 vessels for comparison if none selected yet
        setSelectedForCompare((prev) => {
          const validPrev = activeToken
            ? prev
            : prev.filter((item) => item.category_slug !== 'governmental-military');
          if (validPrev.length > 0 || prodData.length < 2) {
            return validPrev;
          }
          const st80 = prodData.find((p) => p.sku === 'ST-80-TUG');
          const pat2380 = prodData.find((p) => p.sku === 'MIL-PATROL-2380');
          if (st80 && pat2380) {
            return [st80, pat2380];
          }
          return [prodData[0], prodData[1]];
        });
      } else {
        setDbHealthy(false);
      }

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
      }
    } catch (err) {
      console.warn('API fetch warning, retrying on reconnect:', err);
      setDbHealthy(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(adminToken);
  }, [adminToken]);

  const handleAdminLogout = async () => {
    try {
      if (adminToken) {
        await fetch('/api/admin/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      }
    } finally {
      setAdminToken(null);
    }
  };

  useEffect(() => {
    const cleanup = startSmoothScroll();
    return cleanup;
  }, []);

  useEffect(() => {
    const anyModalOpen = Boolean(
      compareModalOpen ||
        aiAssistantOpen ||
        adminPanelOpen ||
        rfqModalOpen ||
        detailProduct ||
        formalOfferData
    );
    setSmoothScrollPaused(anyModalOpen);
  }, [
    compareModalOpen,
    aiAssistantOpen,
    adminPanelOpen,
    rfqModalOpen,
    detailProduct,
    formalOfferData,
  ]);

  // Toggle compare selection
  const handleToggleCompare = (product: ProductItem) => {
    if (selectedForCompare.some((p) => p.id === product.id)) {
      setSelectedForCompare(selectedForCompare.filter((p) => p.id !== product.id));
    } else {
      if (selectedForCompare.length >= 3) {
        alert('You can compare a maximum of 3 vessels simultaneously.');
        return;
      }
      setSelectedForCompare([...selectedForCompare, product]);
    }
  };

  const handleOpenAi = (prompt?: string) => {
    setAiInitialPrompt(prompt || '');
    setAiAssistantOpen(true);
  };

  const handleOpenRfq = (product?: ProductItem) => {
    setActiveRfqProduct(product || null);
    setRfqModalOpen(true);
  };

  const handleOpenFormalOffer = (product: ProductItem, customData?: any) => {
    const offer = generateFormalQuotationOffer(product, customData);
    setFormalOfferData(offer);
  };

  const handleApplyAiFilter = (matchedSkus: string[]) => {
    if (!matchedSkus || matchedSkus.length === 0) return;
    setSelectedCategory('all');
  };

  const handleCompareSkus = (skus: string[]) => {
    const toCompare = products.filter((p) => skus.includes(p.sku) || skus.includes(p.id));
    if (toCompare.length >= 2) {
      setSelectedForCompare(toCompare.slice(0, 3));
      setCompareModalOpen(true);
    }
  };

  const handleInspectFlagship = (sku: string) => {
    const target = products.find((p) => p.sku === sku || p.id === sku);
    if (target) {
      setDetailProduct(target);
    } else if (!adminToken) {
      setSelectedCategory('governmental-military');
      const catalogElem = document.getElementById('fleet-catalogue');
      if (catalogElem) {
        catalogElem.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (products.length > 0) {
      setDetailProduct(products[0]);
    }
  };

  const handleSearchFromHero = (query: string) => {
    setSearchQuery(query);
    const catalogElem = document.getElementById('fleet-catalogue');
    if (catalogElem) {
      catalogElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectTab = (tab: 'overview' | 'catalogue' | 'compare' | 'ai' | 'commercial') => {
    setActiveTab(tab);
    if (tab === 'overview') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'catalogue') {
      const catalogElem = document.getElementById('fleet-catalogue');
      if (catalogElem) {
        catalogElem.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (tab === 'compare') {
      setCompareModalOpen(true);
    } else if (tab === 'ai') {
      handleOpenAi('');
    } else if (tab === 'commercial') {
      if (products.length > 0) {
        const flagship = products.find((p) => p.sku === 'ST-80-TUG') || products[0];
        handleOpenFormalOffer(flagship);
      } else {
        handleOpenRfq();
      }
    }
  };

  const flagshipProduct = products.find((p) => p.sku === 'ST-80-TUG') || products[0];

  return (
    <div className="relative min-h-screen bg-[#091830] text-[#FAF5EA] font-sans flex flex-col justify-between selection:bg-[#FF6B52] selection:text-[#FAF5EA]">
      {/* Full-bleed WebGL GPU Fluid Simulation Backdrop + Navy Radial Scrim */}
      <FluidBackdrop />

      {/* 1. TOP HORIZONTAL NAVBAR matching prototype photo */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        compareCount={selectedForCompare.length}
        onOpenCompare={() => setCompareModalOpen(true)}
        onOpenAi={() => handleOpenAi('')}
        onOpenRfq={() => handleOpenRfq()}
        onOpenAdmin={() => setAdminPanelOpen(true)}
        dbHealthy={dbHealthy}
        totalProducts={products.length}
      />

      {/* 2. MAIN CONTAINER */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* HERO SECTION matching prototype */}
        <HeroSection
          onSearch={handleSearchFromHero}
          onOpenAi={handleOpenAi}
          onOpenRfq={handleOpenRfq}
          onInspectFlagship={handleInspectFlagship}
          flagshipProduct={flagshipProduct}
        />

        {/* FULL CATALOGUE & SPECIFICATIONS VIEW */}
        <ProductCatalog
          products={products}
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => setSelectedCategory(cat)}
          selectedForCompare={selectedForCompare}
          onToggleCompare={handleToggleCompare}
          onOpenCompareModal={() => setCompareModalOpen(true)}
          onClearCompare={() => setSelectedForCompare([])}
          onViewProductDetail={(p) => setDetailProduct(p)}
          onRequestQuote={(p) => handleOpenRfq(p)}
          onViewFormalOffer={(p) => handleOpenFormalOffer(p)}
          externalSearch={searchQuery}
          onResetSearch={() => setSearchQuery('')}
          adminToken={adminToken}
          onAdminTokenChange={setAdminToken}
          onAdminLogout={handleAdminLogout}
        />
      </main>

      {/* 3. FOOTER */}
      <Footer
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          const catalogElem = document.getElementById('fleet-catalogue');
          if (catalogElem) catalogElem.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenAdmin={() => setAdminPanelOpen(true)}
      />

      {/* 4. MODALS */}

      {/* Side-by-side AI Product Comparison */}
      {compareModalOpen && (
        <ProductComparisonModal
          products={selectedForCompare}
          onClose={() => setCompareModalOpen(false)}
          onRemoveProduct={(id) =>
            setSelectedForCompare(selectedForCompare.filter((p) => p.id !== id))
          }
          onRequestQuote={(p) => {
            setCompareModalOpen(false);
            handleOpenRfq(p);
          }}
        />
      )}

      {/* Gemini AI Copilot & Relational Database Manager */}
      {aiAssistantOpen && (
        <AiAssistantModal
          initialPrompt={aiInitialPrompt}
          products={products}
          adminToken={adminToken}
          onAdminTokenChange={setAdminToken}
          onClose={() => setAiAssistantOpen(false)}
          onApplyFilter={handleApplyAiFilter}
          onCompareSkus={handleCompareSkus}
          onProductUpdated={fetchData}
        />
      )}

      {/* Admin Database & CRUD Panel */}
      {adminPanelOpen && (
        <AdminDashboard
          products={products}
          categories={categories}
          adminToken={adminToken}
          onAdminTokenChange={setAdminToken}
          onClose={() => setAdminPanelOpen(false)}
          onRefreshData={fetchData}
          onViewFormalOffer={(p, rfq) => handleOpenFormalOffer(p, rfq)}
        />
      )}

      {/* Product Detailed Technical Specification Sheet */}
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onToggleCompare={handleToggleCompare}
          isCompared={selectedForCompare.some((p) => p.id === detailProduct.id)}
          onRequestQuote={(p) => {
            setDetailProduct(null);
            handleOpenRfq(p);
          }}
          onViewFormalOffer={(p) => {
            setDetailProduct(null);
            handleOpenFormalOffer(p);
          }}
        />
      )}

      {/* Request For Quotation (RFQ) Submission */}
      {rfqModalOpen && (
        <RfqModal
          product={activeRfqProduct}
          onClose={() => setRfqModalOpen(false)}
          onSubmitted={fetchData}
          onViewFormalOffer={(p, customData) => {
            setRfqModalOpen(false);
            handleOpenFormalOffer(p, customData);
          }}
        />
      )}

      {/* Formal ISO 9001:2015 Techno-Commercial Quotation Offer Modal */}
      {formalOfferData && (
        <FormalQuotationModal
          quotation={formalOfferData}
          onClose={() => setFormalOfferData(null)}
        />
      )}
    </div>
  );
}
