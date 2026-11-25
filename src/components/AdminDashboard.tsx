import React, { useState, useEffect } from 'react';
import {
  Database,
  X,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Terminal,
  FileSpreadsheet,
  AlertTriangle,
  History,
  Layers,
  Save,
  Lock,
  LogOut,
  KeyRound,
} from 'lucide-react';
import { ProductItem, CategoryItem, QuotationRequestItem, SystemStats } from '../types.ts';
import { validateProductInput } from '../utils/productLogic.ts';

interface AdminDashboardProps {
  products: ProductItem[];
  categories: CategoryItem[];
  adminToken: string | null;
  onAdminTokenChange: (token: string | null) => void;
  onClose: () => void;
  onRefreshData: () => void;
  onViewFormalOffer?: (product: ProductItem, rfq?: Partial<QuotationRequestItem>) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  products,
  categories,
  adminToken,
  onAdminTokenChange,
  onClose,
  onRefreshData,
  onViewFormalOffer,
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'rfqs' | 'sql' | 'audit'>('products');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [rfqs, setRfqs] = useState<QuotationRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Admin Auth State
  const [authMode, setAuthMode] = useState<'checking' | 'unclaimed' | 'env' | 'claimed'>('checking');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [confirmPasscodeInput, setConfirmPasscodeInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Product Add / Edit Modal State
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formSku, setFormSku] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('cat-hydraulics');
  const [formShortDesc, setFormShortDesc] = useState('');
  const [formPrice, setFormPrice] = useState('1200');
  const [formStock, setFormStock] = useState('10');
  const [formLeadTime, setFormLeadTime] = useState('7');
  const [formImageUrl, setFormImageUrl] = useState(
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800'
  );
  const [formSpecs, setFormSpecs] = useState<
    { key: string; value: string; unit: string; highlight: boolean }[]
  >([
    { key: 'Working Pressure', value: '40', unit: 'Bar', highlight: true },
    { key: 'Material', value: 'SS 316L', unit: '', highlight: false },
  ]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // SQL Console State
  const [sqlQuery, setSqlQuery] = useState('SELECT sku, title, price_usd, stock_quantity FROM products LIMIT 10;');
  const [sqlResult, setSqlResult] = useState<any>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);

  // Search filter inside admin products
  const [adminSearch, setAdminSearch] = useState('');

  const authHeaders = (extra?: Record<string, string>): Record<string, string> => ({
    ...(extra || {}),
    ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
  });

  const handleUnauthorized = () => {
    onAdminTokenChange(null);
    setIsAuthenticated(false);
    setAuthError('Session expired or unauthorized. Please sign in.');
  };

  const checkAuthStatus = async (tokenToCheck: string | null) => {
    try {
      const res = await fetch('/api/admin/auth/status', {
        headers: tokenToCheck ? { Authorization: `Bearer ${tokenToCheck}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setAuthMode(data.mode || 'claimed');
        const authed = Boolean(data.authenticated);
        setIsAuthenticated(authed);
        if (!authed && tokenToCheck) {
          onAdminTokenChange(null);
        }
      }
    } catch {
      setAuthMode('claimed');
      setIsAuthenticated(false);
    }
  };

  const fetchStats = async (tokenOverride?: string) => {
    const token = tokenOverride ?? adminToken;
    if (!token) return;
    try {
      const res = await fetch('/api/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.warn('Failed to fetch stats:', e);
    }
  };

  const fetchRfqs = async (tokenOverride?: string) => {
    const token = tokenOverride ?? adminToken;
    if (!token) return;
    try {
      const res = await fetch('/api/rfq', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setRfqs(data);
      }
    } catch (e) {
      console.warn('Failed to fetch RFQs:', e);
    }
  };

  useEffect(() => {
    checkAuthStatus(adminToken);
  }, [adminToken]);

  useEffect(() => {
    if (isAuthenticated && adminToken) {
      fetchStats();
      fetchRfqs();
    }
  }, [isAuthenticated, adminToken]);

  const handleAdminAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (authMode === 'unclaimed') {
      if (passcodeInput.trim().length < 8) {
        setAuthError('Passcode must be at least 8 characters.');
        return;
      }
      if (passcodeInput !== confirmPasscodeInput) {
        setAuthError('Passcodes do not match.');
        return;
      }
    }

    setAuthSubmitting(true);
    try {
      const endpoint = authMode === 'unclaimed' ? '/api/admin/auth/claim' : '/api/admin/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcodeInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.mode === 'unclaimed') {
          setAuthMode('unclaimed');
        }
        setAuthError(data.error || 'Authentication failed.');
        return;
      }

      onAdminTokenChange(data.token);
      setIsAuthenticated(true);
      setAuthMode(data.mode || 'claimed');
      setPasscodeInput('');
      setConfirmPasscodeInput('');
    } catch {
      setAuthError('Unable to reach authentication service.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (adminToken) {
        await fetch('/api/admin/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      }
    } finally {
      onAdminTokenChange(null);
      setIsAuthenticated(false);
      setStats(null);
      setRfqs([]);
    }
  };

  const showNotification = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  // Quick Stock Update
  const handleQuickStockUpdate = async (id: string, newStock: number) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ stock_quantity: newStock }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        onRefreshData();
        fetchStats();
        showNotification('Stock level persisted to SQLite database.');
      }
    } catch (e) {
      showNotification('Error updating stock.');
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id: string, sku: string) => {
    if (!window.confirm(`Are you sure you want to delete SKU ${sku} and its cascading specifications?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        onRefreshData();
        fetchStats();
        showNotification(`Deleted SKU ${sku} successfully.`);
      }
    } catch (e) {
      showNotification('Error deleting product.');
    }
  };

  // Open Add Product Form
  const openAddForm = () => {
    setIsAddingNew(true);
    setEditingProduct(null);
    setFormSku('HY-NEW-' + Math.floor(100 + Math.random() * 900));
    setFormTitle('');
    setFormCategoryId(categories[0]?.id || 'cat-hydraulics');
    setFormShortDesc('');
    setFormPrice('1500');
    setFormStock('10');
    setFormLeadTime('7');
    setFormImageUrl('https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800');
    setFormSpecs([
      { key: 'Working Pressure', value: '40', unit: 'Bar', highlight: true },
      { key: 'Material', value: 'Stainless Steel 316L', unit: '', highlight: false },
    ]);
    setFormErrors({});
  };

  // Open Edit Product Form
  const openEditForm = (prod: ProductItem) => {
    setEditingProduct(prod);
    setIsAddingNew(false);
    setFormSku(prod.sku);
    setFormTitle(prod.title);
    setFormCategoryId(prod.category_id);
    setFormShortDesc(prod.short_desc || '');
    setFormPrice(String(prod.price_usd));
    setFormStock(String(prod.stock_quantity));
    setFormLeadTime(String(prod.lead_time_days));
    setFormImageUrl(prod.image_url);
    setFormSpecs(
      (prod.specifications || []).map((s) => ({
        key: s.key,
        value: s.value,
        unit: s.unit || '',
        highlight: !!s.highlight,
      }))
    );
    setFormErrors({});
  };

  // Save Product (Add or Edit)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    const priceNum = parseFloat(formPrice);
    const stockNum = parseInt(formStock, 10);
    const leadNum = parseInt(formLeadTime, 10);

    const validation = validateProductInput({
      sku: formSku,
      title: formTitle,
      price_usd: priceNum,
      stock_quantity: stockNum,
    });

    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    const payload = {
      category_id: formCategoryId,
      sku: formSku.trim().toUpperCase(),
      title: formTitle.trim(),
      short_desc: formShortDesc.trim(),
      price_usd: priceNum,
      stock_quantity: stockNum,
      lead_time_days: leadNum,
      image_url: formImageUrl.trim(),
      specifications: formSpecs.filter((s) => s.key.trim() && s.value.trim()),
    };

    setLoading(true);
    try {
      if (isAddingNew) {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        });
        if (res.status === 401) {
          handleUnauthorized();
          return;
        }
        if (res.ok) {
          showNotification(`Added new product ${payload.sku} to database.`);
          setIsAddingNew(false);
          onRefreshData();
          fetchStats();
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to add product');
        }
      } else if (editingProduct) {
        const res = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        });
        if (res.status === 401) {
          handleUnauthorized();
          return;
        }
        if (res.ok) {
          showNotification(`Updated product ${payload.sku} in database.`);
          setEditingProduct(null);
          onRefreshData();
          fetchStats();
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to update product');
        }
      }
    } catch (e: any) {
      alert(e.message || 'Error saving product');
    } finally {
      setLoading(false);
    }
  };

  // Update RFQ Status
  const handleUpdateRfqStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/rfq/${id}`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        fetchRfqs();
        showNotification(`RFQ status updated to ${status}.`);
      }
    } catch (e) {
      showNotification('Failed to update RFQ status');
    }
  };

  // Run Read-Only SQL Query
  const handleExecuteSql = async () => {
    if (!sqlQuery.trim()) return;
    setSqlError(null);
    setSqlResult(null);

    try {
      const res = await fetch('/api/admin/sql', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ query: sqlQuery }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Query failed');
      }
      setSqlResult(data);
      onRefreshData();
      fetchStats();
    } catch (e: any) {
      setSqlError(e.message);
    }
  };

  // Reset Seed Data
  const handleResetSeed = async () => {
    if (!window.confirm('Reset database to HY Precision Technology seed records? All customized records will be reverted.')) {
      return;
    }
    try {
      const res = await fetch('/api/admin/reset-seed', {
        method: 'POST',
        headers: authHeaders(),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        showNotification('Database reset to seed data.');
        onRefreshData();
        fetchStats();
        fetchRfqs();
      }
    } catch (e) {
      showNotification('Reset failed');
    }
  };

  const filteredAdminProducts = products.filter(
    (p) =>
      p.sku.toLowerCase().includes(adminSearch.toLowerCase()) ||
      p.title.toLowerCase().includes(adminSearch.toLowerCase()) ||
      (p.category_name || '').toLowerCase().includes(adminSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-0 overflow-hidden">
      <div className="bg-[#18181B] w-full h-full flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        {/* Admin Header */}
        <div className="p-4 sm:p-5 bg-[#121215] text-white flex justify-between items-center shrink-0 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-[#FF6B52] border border-white/10">
              <Database size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-editorial text-xl sm:text-2xl font-bold">
                  Relational Database & Management Console
                </h3>
              </div>
              <p className="mono text-[10px] text-white/50 tracking-wider">
                Full CRUD control over inventory, specifications, and RFQ client submissions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <>
                <button
                  onClick={handleResetSeed}
                  className="mono text-[10px] text-white/70 hover:text-white px-2.5 py-1.5 border border-white/20 hover:border-white/50 transition uppercase tracking-wider cursor-pointer"
                  title="Reset to default seed products"
                >
                  Reset Seed Data
                </button>
                <button
                  onClick={handleLogout}
                  className="mono text-[10px] text-[#FF6B52] hover:text-white px-2.5 py-1.5 border border-[#FF6B52]/40 hover:bg-[#FF6B52] transition uppercase tracking-wider cursor-pointer flex items-center gap-1"
                  title="Sign out of Admin session"
                >
                  <LogOut size={12} />
                  <span>Sign Out</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-white/70 hover:text-white transition"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {!isAuthenticated ? (
          <div className="flex-1 bg-[#18181B] flex items-center justify-center p-6 overflow-y-auto">
            <div className="w-full max-w-md bg-[#1E1E24] border border-white/10 p-6 sm:p-8 shadow-2xl space-y-5">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="p-2.5 bg-[#232329] text-[#FF6B52] border border-white/10">
                  {authMode === 'unclaimed' ? <KeyRound size={20} /> : <Lock size={20} />}
                </div>
                <div>
                  <h4 className="font-editorial text-xl font-bold text-white">
                    {authMode === 'checking'
                      ? 'Verifying Session...'
                      : authMode === 'unclaimed'
                      ? 'First-Run Admin Setup'
                      : 'Admin Authentication Required'}
                  </h4>
                  <p className="mono text-[10px] text-zinc-400">
                    {authMode === 'unclaimed'
                      ? 'Set an initial administrator passcode to lock this console.'
                      : 'Enter your administrator passcode to unlock database access.'}
                  </p>
                </div>
              </div>

              {authMode === 'checking' ? (
                <div className="py-8 text-center mono text-xs text-zinc-400">
                  Checking server authentication status...
                </div>
              ) : (
                <form onSubmit={handleAdminAuthSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block mono text-[10px] text-zinc-400 uppercase font-semibold mb-1.5">
                      {authMode === 'unclaimed' ? 'Create Admin Passcode (min 8 chars)' : 'Admin Passcode'}
                    </label>
                    <input
                      type="password"
                      required
                      autoFocus
                      value={passcodeInput}
                      onChange={(e) => setPasscodeInput(e.target.value)}
                      placeholder="Enter passcode..."
                      className="w-full px-3.5 py-2.5 bg-[#232329] border border-white/15 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#FF6B52]"
                    />
                  </div>

                  {authMode === 'unclaimed' && (
                    <div>
                      <label className="block mono text-[10px] text-zinc-400 uppercase font-semibold mb-1.5">
                        Confirm Admin Passcode
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmPasscodeInput}
                        onChange={(e) => setConfirmPasscodeInput(e.target.value)}
                        placeholder="Re-enter passcode..."
                        className="w-full px-3.5 py-2.5 bg-[#232329] border border-white/15 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#FF6B52]"
                      />
                    </div>
                  )}

                  {authError && (
                    <div className="p-2.5 bg-rose-950/60 border border-rose-500/40 text-rose-200 mono text-[11px]">
                      {authError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 border border-white/15 bg-[#27272A] hover:bg-[#32323A] text-zinc-200 mono text-xs uppercase tracking-wider cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={authSubmitting}
                      className="px-5 py-2 bg-[#FF6B52] hover:bg-[#F0543B] text-white font-bold mono text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
                    >
                      {authSubmitting
                        ? 'Verifying...'
                        : authMode === 'unclaimed'
                        ? 'Claim Admin Access'
                        : 'Unlock Console'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        ) : (
          <>

        {/* Stats Strip */}
        <div className="bg-[#18181B] text-zinc-100 px-5 py-2.5 border-b border-white/10 flex flex-wrap items-center justify-between text-xs gap-3 shrink-0">
          <div className="flex items-center gap-4 sm:gap-6 mono text-[11px]">
            <div>
              <span className="text-zinc-400">TOTAL PRODUCTS:</span>{' '}
              <strong className="text-white font-bold">{stats?.productsCount ?? products.length}</strong>
            </div>
            <div>
              <span className="text-zinc-400">CATEGORIES:</span>{' '}
              <strong className="text-white font-bold">{stats?.categoriesCount ?? categories.length}</strong>
            </div>
            <div>
              <span className="text-zinc-400">PENDING RFQS:</span>{' '}
              <strong className="text-[#FF6B52] font-bold">
                {rfqs.filter((r) => r.status === 'PENDING').length}
              </strong>
            </div>
            <div>
              <span className="text-zinc-400">LOW STOCK ITEMS:</span>{' '}
              <strong className="text-rose-400 font-bold">{stats?.lowStockCount ?? 0}</strong>
            </div>
          </div>

          {actionMessage && (
            <div className="text-emerald-400 mono text-[10px] font-bold flex items-center gap-1.5 animate-fade-in">
              <CheckCircle2 size={12} /> {actionMessage}
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="bg-[#141417] px-4 border-b border-white/10 flex gap-2 text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('products')}
            className={`py-2.5 px-4 mono text-[11px] uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 border-b-2 ${
              activeTab === 'products'
                ? 'border-[#FF6B52] text-white font-bold bg-[#1E1E24]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers size={13} /> Products Inventory ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('rfqs')}
            className={`py-2.5 px-4 mono text-[11px] uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 border-b-2 ${
              activeTab === 'rfqs'
                ? 'border-[#FF6B52] text-white font-bold bg-[#1E1E24]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileSpreadsheet size={13} /> Quotation Requests ({rfqs.length})
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`py-2.5 px-4 mono text-[11px] uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 border-b-2 ${
              activeTab === 'sql'
                ? 'border-[#FF6B52] text-white font-bold bg-[#1E1E24]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Terminal size={13} /> SQL Query Console
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-2.5 px-4 mono text-[11px] uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 border-b-2 ${
              activeTab === 'audit'
                ? 'border-[#FF6B52] text-white font-bold bg-[#1E1E24]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History size={13} /> Transaction Audit Trail
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#18181B] text-zinc-100">
          {/* TAB 1: PRODUCTS INVENTORY */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 text-zinc-400" size={14} />
                  <input
                    type="text"
                    placeholder="Filter SKU or title..."
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-[#232329] border border-white/15 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#FF6B52]"
                  />
                </div>

                <button
                  onClick={openAddForm}
                  className="px-3.5 py-2 bg-[#FF6B52] hover:bg-[#F0543B] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <Plus size={14} /> Add New Component
                </button>
              </div>

              {/* Table */}
              <div className="border border-white/10 rounded-xl overflow-hidden bg-[#1E1E24] shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#121215] text-zinc-200 font-bold border-b border-white/10">
                      <tr>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Title & Category</th>
                        <th className="p-3">FOB Price</th>
                        <th className="p-3">Live Stock</th>
                        <th className="p-3">Lead Time</th>
                        <th className="p-3">Specs Count</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {filteredAdminProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-white/5 transition">
                          <td className="p-3 font-mono font-bold text-[#FF6B52]">{p.sku}</td>
                          <td className="p-3">
                            <div className="font-semibold text-white max-w-xs truncate">
                              {p.title}
                            </div>
                            <div className="text-[10px] text-zinc-400">{p.category_name}</div>
                          </td>
                          <td className="p-3 font-mono font-bold text-zinc-100">
                            ${p.price_usd.toLocaleString()}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                defaultValue={p.stock_quantity}
                                onBlur={(e) =>
                                  handleQuickStockUpdate(p.id, parseInt(e.target.value, 10) || 0)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleQuickStockUpdate(
                                      p.id,
                                      parseInt((e.target as any).value, 10) || 0
                                    );
                                  }
                                }}
                                className="w-16 px-2 py-1 border border-white/15 rounded text-xs text-center font-bold bg-[#232329] text-white focus:bg-[#2A2A32] focus:outline-none focus:border-[#FF6B52]"
                                title="Press Enter or click outside to save stock"
                              />
                              <span className="text-[10px] text-zinc-400">units</span>
                            </div>
                          </td>
                          <td className="p-3 text-zinc-300">{p.lead_time_days} days</td>
                          <td className="p-3 text-zinc-400">
                            {p.specifications?.length || 0} params
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditForm(p)}
                                className="p-1.5 text-zinc-300 hover:text-white hover:bg-white/10 rounded cursor-pointer"
                                title="Edit Product"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id, p.sku)}
                                className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 rounded cursor-pointer"
                                title="Delete Product"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RFQ QUOTATION REQUESTS */}
          {activeTab === 'rfqs' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-white text-sm">
                  Client Request For Quotation (RFQ) Records
                </h4>
                <button
                  onClick={() => fetchRfqs()}
                  className="px-2.5 py-1 text-xs text-[#FF6B52] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>

              {rfqs.length === 0 ? (
                <div className="p-8 text-center bg-[#1E1E24] rounded-xl border border-white/10 text-zinc-400 text-xs">
                  No quotation requests logged yet. Use the "Request Quote" form on the main page to test.
                </div>
              ) : (
                <div className="border border-white/10 rounded-xl overflow-hidden bg-[#1E1E24] shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#121215] text-zinc-200 font-bold border-b border-white/10">
                      <tr>
                        <th className="p-3">Customer / Company</th>
                        <th className="p-3">Target Component</th>
                        <th className="p-3">Quantity</th>
                        <th className="p-3">Custom Requirements</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {rfqs.map((r) => (
                        <tr key={r.id} className="hover:bg-white/5">
                          <td className="p-3">
                            <div className="font-bold text-white">{r.customer_name}</div>
                            <div className="text-zinc-400 text-[11px]">{r.company_name}</div>
                            <div className="text-[#FF6B52] text-[10px]">{r.email} • {r.phone}</div>
                          </td>
                          <td className="p-3 font-mono font-medium text-zinc-200">
                            {r.product_sku ? (
                              <span className="bg-[#27272A] text-[#FF6B52] border border-white/10 px-2 py-0.5 rounded font-bold">
                                {r.product_sku}
                              </span>
                            ) : (
                              <span className="text-zinc-500">General Inquiry</span>
                            )}
                          </td>
                          <td className="p-3 font-bold text-zinc-100">{r.quantity_requested} units</td>
                          <td className="p-3 text-zinc-300 max-w-xs text-[11px] leading-relaxed">
                            {r.custom_specs || 'Standard catalog tolerance'}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.status === 'PENDING'
                                  ? 'bg-[#FF6B52]/20 text-[#FF6B52]'
                                  : r.status === 'QUOTED'
                                  ? 'bg-sky-500/20 text-sky-300'
                                  : r.status === 'APPROVED'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-zinc-700 text-zinc-300'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {onViewFormalOffer && (
                                <button
                                  onClick={() => {
                                    const matchingProd = products.find(
                                      (p) => p.id === r.product_id || p.sku === r.product_sku
                                    ) || products[0];
                                    if (matchingProd) {
                                      onViewFormalOffer(matchingProd, r);
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-[#FF6B52] hover:bg-[#F0543B] text-white font-bold text-[10px] mono uppercase tracking-wider rounded transition cursor-pointer"
                                  title="View authentic ISO 9001:2015 Techno-Commercial Offer document matching sample PDF"
                                >
                                  View Offer (PDF)
                                </button>
                              )}
                              <select
                                value={r.status}
                                onChange={(e) => handleUpdateRfqStatus(r.id, e.target.value)}
                                className="px-2 py-1 border border-white/15 rounded text-[11px] bg-[#232329] text-zinc-100 cursor-pointer"
                              >
                                <option value="PENDING">PENDING</option>
                                <option value="QUOTED">QUOTED</option>
                                <option value="APPROVED">APPROVED</option>
                                <option value="ARCHIVED">ARCHIVED</option>
                              </select>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SQL QUERY CONSOLE */}
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="bg-[#1E1E24] rounded-xl p-4 text-white border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#FF6B52]">
                    <Terminal size={14} />
                    <span>SQLite Relational Engine Terminal</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setSqlQuery('SELECT sku, title, price_usd, stock_quantity FROM products WHERE stock_quantity <= 5;')
                      }
                      className="text-[11px] px-2 py-0.5 bg-[#27272A] hover:bg-[#32323A] text-zinc-200 rounded border border-white/10 cursor-pointer"
                    >
                      Low Stock Query
                    </button>
                    <button
                      onClick={() =>
                        setSqlQuery('SELECT c.name, COUNT(p.id) as total_products FROM categories c LEFT JOIN products p ON c.id = p.category_id GROUP BY c.id;')
                      }
                      className="text-[11px] px-2 py-0.5 bg-[#27272A] hover:bg-[#32323A] text-zinc-200 rounded border border-white/10 cursor-pointer"
                    >
                      Count by Domain
                    </button>
                    <button
                      onClick={() =>
                        setSqlQuery('SELECT p.sku, ps.spec_key, ps.spec_value, ps.unit FROM product_specifications ps JOIN products p ON ps.product_id = p.id LIMIT 15;')
                      }
                      className="text-[11px] px-2 py-0.5 bg-[#27272A] hover:bg-[#32323A] text-zinc-200 rounded border border-white/10 cursor-pointer"
                    >
                      Join Specs
                    </button>
                  </div>
                </div>

                <textarea
                  rows={4}
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  className="w-full bg-[#121215] font-mono text-xs text-emerald-400 p-3 rounded-lg border border-white/10 focus:outline-none focus:ring-1 focus:ring-[#FF6B52]"
                ></textarea>

                <div className="flex justify-end">
                  <button
                    onClick={handleExecuteSql}
                    className="px-4 py-2 bg-[#FF6B52] hover:bg-[#F0543B] text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <span>Execute SQL Query</span>
                  </button>
                </div>
              </div>

              {sqlError && (
                <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-200 text-xs font-mono">
                  Error: {sqlError}
                </div>
              )}

              {sqlResult && (
                <div className="bg-[#1E1E24] border border-white/10 rounded-xl p-4 overflow-hidden shadow-xs">
                  <div className="text-xs font-bold text-white mb-2">
                    Query Results ({sqlResult.count ?? sqlResult.rows?.length ?? 0} rows):
                  </div>
                  {sqlResult.rows && sqlResult.rows.length > 0 ? (
                    <div className="overflow-x-auto max-h-64">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-[#121215] border-b border-white/10">
                          <tr>
                            {Object.keys(sqlResult.rows[0]).map((col) => (
                              <th key={col} className="p-2 text-zinc-300">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {sqlResult.rows.map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-white/5">
                              {Object.values(row).map((val: any, cIdx) => (
                                <td key={cIdx} className="p-2 text-zinc-200">
                                  {String(val ?? 'NULL')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-400 italic">{sqlResult.message || 'No rows returned.'}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <h4 className="font-bold text-white text-sm">Real-time Transaction Audit Log</h4>
              <div className="border border-white/10 rounded-xl overflow-hidden bg-[#1E1E24] shadow-xs">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#121215] text-zinc-200 font-bold border-b border-white/10">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Entity Type</th>
                      <th className="p-3">Entity ID</th>
                      <th className="p-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-[11px]">
                    {stats?.recentLogs && stats.recentLogs.length > 0 ? (
                      stats.recentLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/5">
                          <td className="p-3 text-zinc-400">{log.created_at}</td>
                          <td className="p-3 font-bold text-[#FF6B52]">{log.action}</td>
                          <td className="p-3 text-zinc-300">{log.entity_type}</td>
                          <td className="p-3 text-zinc-400">{log.entity_id}</td>
                          <td className="p-3 text-zinc-100 font-sans">{log.details}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-zinc-400">
                          No audit logs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* MODAL: ADD / EDIT PRODUCT */}
        {(isAddingNew || editingProduct) && (
          <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3">
            <div className="bg-[#18181B] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-white/15 text-zinc-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-white text-base">
                  {isAddingNew ? 'Add New Product to Relational DB' : `Edit Product: ${formSku}`}
                </h3>
                <button
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingProduct(null);
                  }}
                  className="text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">SKU *</label>
                    <input
                      type="text"
                      value={formSku}
                      onChange={(e) => setFormSku(e.target.value)}
                      className="w-full px-3 py-2 border border-white/15 rounded-xl font-mono uppercase bg-[#232329] text-white focus:outline-none focus:border-[#FF6B52]"
                      required
                    />
                    {formErrors.sku && <p className="text-rose-400 text-[10px] mt-0.5">{formErrors.sku}</p>}
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Category *</label>
                    <select
                      value={formCategoryId}
                      onChange={(e) => setFormCategoryId(e.target.value)}
                      className="w-full px-3 py-2 border border-white/15 rounded-xl bg-[#232329] text-white focus:outline-none focus:border-[#FF6B52]"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Product Title *</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-white/15 rounded-xl bg-[#232329] text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF6B52]"
                    placeholder="e.g., Three-Spindle High Pressure Screw Pump"
                    required
                  />
                  {formErrors.title && <p className="text-rose-400 text-[10px] mt-0.5">{formErrors.title}</p>}
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Short Description</label>
                  <textarea
                    rows={2}
                    value={formShortDesc}
                    onChange={(e) => setFormShortDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-white/15 rounded-xl bg-[#232329] text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF6B52]"
                    placeholder="Engineering features, applications, and operating medium..."
                  ></textarea>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Unit Price ($ FOB) *</label>
                    <input
                      type="number"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      className="w-full px-3 py-2 border border-white/15 rounded-xl font-mono bg-[#232329] text-white focus:outline-none focus:border-[#FF6B52]"
                      required
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Stock Quantity *</label>
                    <input
                      type="number"
                      value={formStock}
                      onChange={(e) => setFormStock(e.target.value)}
                      className="w-full px-3 py-2 border border-white/15 rounded-xl font-mono bg-[#232329] text-white focus:outline-none focus:border-[#FF6B52]"
                      required
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Lead Time (Days)</label>
                    <input
                      type="number"
                      value={formLeadTime}
                      onChange={(e) => setFormLeadTime(e.target.value)}
                      className="w-full px-3 py-2 border border-white/15 rounded-xl font-mono bg-[#232329] text-white focus:outline-none focus:border-[#FF6B52]"
                      min={1}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Image URL</label>
                  <input
                    type="url"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-white/15 rounded-xl font-mono text-[11px] bg-[#232329] text-white focus:outline-none focus:border-[#FF6B52]"
                  />
                </div>

                {/* Relational Specifications Builder */}
                <div className="border border-white/10 rounded-xl p-3 bg-[#141417] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">Technical Specifications</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormSpecs([...formSpecs, { key: '', value: '', unit: '', highlight: false }])
                      }
                      className="text-[#FF6B52] hover:text-[#F0543B] font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} /> Add Spec Field
                    </button>
                  </div>

                  {formSpecs.map((spec, sIdx) => (
                    <div key={sIdx} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Key (e.g. Pressure Rating)"
                        value={spec.key}
                        onChange={(e) => {
                          const updated = [...formSpecs];
                          updated[sIdx].key = e.target.value;
                          setFormSpecs(updated);
                        }}
                        className="col-span-5 px-2 py-1.5 border border-white/15 rounded-lg bg-[#232329] text-white text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. 40)"
                        value={spec.value}
                        onChange={(e) => {
                          const updated = [...formSpecs];
                          updated[sIdx].value = e.target.value;
                          setFormSpecs(updated);
                        }}
                        className="col-span-3 px-2 py-1.5 border border-white/15 rounded-lg bg-[#232329] text-white text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Unit (Bar)"
                        value={spec.unit}
                        onChange={(e) => {
                          const updated = [...formSpecs];
                          updated[sIdx].unit = e.target.value;
                          setFormSpecs(updated);
                        }}
                        className="col-span-2 px-2 py-1.5 border border-white/15 rounded-lg bg-[#232329] text-white text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setFormSpecs(formSpecs.filter((_, idx) => idx !== sIdx))}
                        className="col-span-2 text-rose-400 hover:text-rose-300 text-right p-1 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNew(false);
                      setEditingProduct(null);
                    }}
                    className="px-4 py-2 border border-white/15 rounded-xl text-zinc-300 hover:bg-white/5 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-[#FF6B52] hover:bg-[#F0543B] text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save size={14} />
                    <span>{loading ? 'Saving...' : 'Commit to Database'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
};
