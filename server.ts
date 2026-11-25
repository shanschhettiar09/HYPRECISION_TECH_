import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllCategories,
  createQuotationRequest,
  getAllQuotationRequests,
  updateQuotationStatus,
  getSystemStats,
  executeRawQuery,
  seedDatabase,
} from './src/server/db.ts';
import { compareProductsWithAI, handleAiDatabaseAgent } from './src/server/gemini.ts';
import { generateFormalQuotationOffer } from './src/utils/quotationDocument.ts';
import {
  requireAdmin,
  isAdminAuthenticated,
  getAdminAuthMode,
  verifyAdminPasscode,
  claimInitialAdminPasscode,
  issueAdminToken,
  revokeAdminTokenFromRequest,
  checkAuthRateLimit,
  recordAuthFailure,
  clearAuthFailures,
} from './src/server/auth.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
// AI Studio requires dev server on port 3000. In Cloud Run, process.env.PORT is often 8080 (used by Nginx).
// Never bind to 8080 to prevent EADDRINUSE conflict with Nginx.
const portArgIndex = process.argv.indexOf('--port');
const cliPort = portArgIndex !== -1 ? Number(process.argv[portArgIndex + 1]) : null;
const PORT = cliPort || (process.env.PORT && process.env.PORT !== '8080' ? Number(process.env.PORT) : 3000);
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '1mb' }));

// ---------------------------------------------------------------------------
// ADMIN AUTHENTICATION ENDPOINTS (Rate-limited, Server-Verified)
// ---------------------------------------------------------------------------

app.get('/api/admin/auth/status', (req, res) => {
  const mode = getAdminAuthMode();
  res.json({
    mode,
    configured: mode !== 'unclaimed',
    authenticated: isAdminAuthenticated(req),
  });
});

app.post('/api/admin/auth/claim', (req, res) => {
  const limit = checkAuthRateLimit(req);
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfterSeconds || 900));
    return res.status(429).json({
      error: 'Too many authentication attempts. Please wait before trying again.',
    });
  }

  const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode : '';
  const result = claimInitialAdminPasscode(passcode);
  if (!result.ok) {
    recordAuthFailure(req);
    return res.status(409).json({ error: result.error });
  }

  clearAuthFailures(req);
  const { token, expiresInMs } = issueAdminToken();
  res.status(201).json({ token, expiresInMs, mode: 'claimed' });
});

app.post('/api/admin/auth/login', (req, res) => {
  const limit = checkAuthRateLimit(req);
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfterSeconds || 900));
    return res.status(429).json({
      error: 'Too many failed login attempts. Please try again later.',
    });
  }

  const mode = getAdminAuthMode();
  if (mode === 'unclaimed') {
    return res.status(409).json({
      error: 'Admin passcode has not been configured yet. Complete first-run setup.',
      mode: 'unclaimed',
    });
  }

  const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode : '';
  if (!verifyAdminPasscode(passcode)) {
    recordAuthFailure(req);
    return res.status(401).json({ error: 'Invalid admin passcode.' });
  }

  clearAuthFailures(req);
  const { token, expiresInMs } = issueAdminToken();
  res.json({ token, expiresInMs, mode });
});

app.post('/api/admin/auth/logout', (req, res) => {
  revokeAdminTokenFromRequest(req);
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// REST API ENDPOINTS
// ---------------------------------------------------------------------------

// 1. GET Products with filter (Public catalog read; Governmental & Defense division requires admin auth)
app.get('/api/products', (req, res) => {
  try {
    const { category, search, minPrice, maxPrice } = req.query;
    const isAuthed = isAdminAuthenticated(req);
    const categorySlug = typeof category === 'string' ? category : undefined;

    if (categorySlug === 'governmental-military' && !isAuthed) {
      return res.status(401).json({
        error: 'Admin passcode authentication required to access Governmental & Defense division.',
      });
    }

    const parsedMin = minPrice !== undefined ? Number(minPrice) : undefined;
    const parsedMax = maxPrice !== undefined ? Number(maxPrice) : undefined;

    if (
      (parsedMin !== undefined && (!Number.isFinite(parsedMin) || parsedMin < 0)) ||
      (parsedMax !== undefined && (!Number.isFinite(parsedMax) || parsedMax < 0))
    ) {
      return res.status(400).json({ error: 'Price filters must be non-negative numbers.' });
    }

    const products = getAllProducts({
      categorySlug,
      search: typeof search === 'string' ? search.slice(0, 120) : undefined,
      minPrice: parsedMin,
      maxPrice: parsedMax,
      includeRestricted: isAuthed,
    });
    res.json(products);
  } catch (err: any) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to retrieve products.' });
  }
});

// 2. GET Single Product (Public catalog read; Governmental & Defense division requires admin auth)
app.get('/api/products/:id', (req, res) => {
  try {
    const product = getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (product.category_slug === 'governmental-military' && !isAdminAuthenticated(req)) {
      return res.status(401).json({
        error: 'Admin passcode authentication required to view Governmental & Defense vessels.',
      });
    }
    res.json(product);
  } catch (err: any) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: 'Failed to retrieve product.' });
  }
});

// 3. POST Create Product (Admin Required)
app.post('/api/products', requireAdmin, (req, res) => {
  try {
    const { specifications, ...productData } = req.body;
    const newProduct = createProduct(productData, Array.isArray(specifications) ? specifications : []);
    res.status(201).json(newProduct);
  } catch (err: any) {
    console.error('Error creating product:', err);
    res.status(400).json({ error: err.message });
  }
});

// 4. PUT Update Product (Admin Required)
app.put('/api/products/:id', requireAdmin, (req, res) => {
  try {
    const { specifications, ...productData } = req.body;
    const updated = updateProduct(
      req.params.id,
      productData,
      Array.isArray(specifications) ? specifications : undefined
    );
    res.json(updated);
  } catch (err: any) {
    console.error('Error updating product:', err);
    res.status(400).json({ error: err.message });
  }
});

// 5. DELETE Product (Admin Required)
app.delete('/api/products/:id', requireAdmin, (req, res) => {
  try {
    const success = deleteProduct(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted from database' });
  } catch (err: any) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'Failed to delete product.' });
  }
});

// 6. GET Categories (Public catalog read)
app.get('/api/categories', (_req, res) => {
  try {
    const categories = getAllCategories();
    res.json(categories);
  } catch (err: any) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Failed to retrieve categories.' });
  }
});

// 7. POST AI Comparison (Public read-only analysis; restricted vessels require admin auth)
app.post('/api/ai/compare', async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!productIds || !Array.isArray(productIds) || productIds.length < 2 || productIds.length > 5) {
      return res.status(400).json({ error: 'Provide between 2 and 5 product IDs to compare' });
    }
    const comparison = await compareProductsWithAI(productIds.map(String), isAdminAuthenticated(req));
    res.json(comparison);
  } catch (err: any) {
    console.error('AI comparison error:', err);
    res.status(500).json({ error: 'Comparison failed.' });
  }
});

// 8. POST AI Natural Language Query & DB Manager Agent
// Note: userRole is derived strictly from verified admin Bearer token; client-supplied role and catalog are ignored.
app.post('/api/ai/query-manager', async (req, res) => {
  try {
    const { prompt, history } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Query prompt is required' });
    }
    const effectiveRole: 'admin' | 'buyer' = isAdminAuthenticated(req) ? 'admin' : 'buyer';
    const result = await handleAiDatabaseAgent(
      prompt,
      effectiveRole,
      Array.isArray(history) ? history : []
    );
    res.json(result);
  } catch (err: any) {
    console.error('AI Query Manager error:', err);
    res.status(500).json({ error: 'AI Query failed.' });
  }
});

// 9. RFQ Endpoints
// Public RFQ submission (strictly validated server-side; restricted division requires admin auth)
app.post('/api/rfq', (req, res) => {
  try {
    if (req.body?.product_id) {
      const targetProd = getProductById(String(req.body.product_id));
      if (targetProd?.category_slug === 'governmental-military' && !isAdminAuthenticated(req)) {
        return res.status(401).json({
          error: 'Admin passcode authentication required to request a quotation for Governmental & Defense vessels.',
        });
      }
    }
    const rfq = createQuotationRequest(req.body);
    res.status(201).json(rfq);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// List all customer RFQs (Admin Required — prevents leaking customer PII)
app.get('/api/rfq', requireAdmin, (_req, res) => {
  try {
    const list = getAllQuotationRequests();
    res.json(list);
  } catch (err: any) {
    console.error('Error fetching RFQs:', err);
    res.status(500).json({ error: 'Failed to retrieve quotation requests.' });
  }
});

// Update RFQ status (Admin Required)
app.put('/api/rfq/:id', requireAdmin, (req, res) => {
  try {
    const updated = updateQuotationStatus(req.params.id, req.body?.status);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 10. Formal Techno-Commercial Quotation Offer Generation
app.get('/api/quotations/product/:id', (req, res) => {
  try {
    const prod = getProductById(req.params.id);
    if (!prod) {
      return res.status(404).json({ error: 'Vessel product not found' });
    }
    if (prod.category_slug === 'governmental-military' && !isAdminAuthenticated(req)) {
      return res.status(401).json({
        error: 'Admin passcode authentication required for Governmental & Defense quotations.',
      });
    }
    const offer = generateFormalQuotationOffer(prod);
    res.json(offer);
  } catch (err: any) {
    console.error('Error generating product offer:', err);
    res.status(500).json({ error: 'Failed to generate quotation offer.' });
  }
});

// View a customer's RFQ offer by ID (Admin Required — prevents IDOR exposure of customer PII)
app.get('/api/quotations/rfq/:id', requireAdmin, (req, res) => {
  try {
    const list = getAllQuotationRequests() as any[];
    const rfq = list.find((r) => r.id === req.params.id);
    if (!rfq) {
      return res.status(404).json({ error: 'Quotation request not found' });
    }
    const prod = rfq.product_id ? getProductById(rfq.product_id) : (getAllProducts()[0] as any);
    const offer = generateFormalQuotationOffer(prod, rfq);
    res.json(offer);
  } catch (err: any) {
    console.error('Error generating RFQ offer:', err);
    res.status(500).json({ error: 'Failed to generate RFQ quotation offer.' });
  }
});

// 11. System Stats & Audit Logs (Admin Required)
app.get('/api/stats', requireAdmin, (_req, res) => {
  try {
    const stats = getSystemStats();
    res.json(stats);
  } catch (err: any) {
    console.error('Error fetching system stats:', err);
    res.status(500).json({ error: 'Failed to retrieve system statistics.' });
  }
});

// 12. Admin Read-Only SQL Console (Admin Required + Read-only single SELECT guard)
app.post('/api/admin/sql', requireAdmin, (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'SQL query required' });
    }
    const result = executeRawQuery(query);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 13. Admin Reset Seed Data (Admin Required)
app.post('/api/admin/reset-seed', requireAdmin, (_req, res) => {
  try {
    seedDatabase();
    res.json({ success: true, message: 'Database reset to default HY Precision seed records.' });
  } catch (err: any) {
    console.error('Error resetting seed data:', err);
    res.status(500).json({ error: 'Failed to reset seed database.' });
  }
});

// ---------------------------------------------------------------------------
// VITE MIDDLEWARE / STATIC ASSETS
// ---------------------------------------------------------------------------
async function startServer() {
  const httpServer = http.createServer(app);

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[HY Precision Technology] Full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
