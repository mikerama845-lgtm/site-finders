import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

const DATA_DIR = path.resolve(process.cwd(), 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function cleanTabName(name: string): string {
  if (!name) return '';
  return name
    .replace(/\\x3d/g, '=')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, u) => String.fromCharCode(parseInt(u, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseTabsFromHtml(html: string): { name: string; gid: string }[] {
  const tabs: { name: string; gid: string }[] = [];

  const addTab = (rawName: string, rawGid: string) => {
    const name = cleanTabName(rawName);
    const gid = String(rawGid).trim();
    if (name && gid && !tabs.some(t => t.gid === gid)) {
      tabs.push({ name, gid });
    }
  };

  // 1. items.push pattern in script (handles multi-line and single-line)
  const regexItems = /items\.push\(\s*\{([\s\S]*?)\}\s*\)/g;
  let match;
  while ((match = regexItems.exec(html)) !== null) {
    const block = match[1];
    const nameM = block.match(/name:\s*["']([^"']+)["']/);
    const gidM = block.match(/gid:\s*["']?([0-9]+)["']?/);
    if (nameM && gidM) {
      addTab(nameM[1], gidM[1]);
    }
  }

  // 2. Fallback name-gid / gid-name regexes
  const regex1 = /name:\s*["']([^"']+)["'][\s\S]*?gid:\s*["']?([0-9]+)["']?/g;
  while ((match = regex1.exec(html)) !== null) {
    addTab(match[1], match[2]);
  }

  const regex2 = /gid:\s*["']?([0-9]+)["']?[\s\S]*?name:\s*["']([^"']+)["']/g;
  while ((match = regex2.exec(html)) !== null) {
    addTab(match[2], match[1]);
  }

  // 3. HTML DOM elements: <li id="sheet-button-xxx">... or <a href="#gid=xxx">...
  const regexDom = /<li[^>]*id=["']sheet-button-([0-9]+)["'][^>]*>([\s\S]*?)<\/li>/gi;
  while ((match = regexDom.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    addTab(text || `Sheet ${match[1]}`, match[1]);
  }

  const regexHref = /<a[^>]*href=["'][^"']*[#&?]gid=([0-9]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = regexHref.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    if (text && !text.includes('href=')) {
      addTab(text, match[1]);
    }
  }

  return tabs;
}

// Proxy route to discover all tabs of a Google Spreadsheet
app.get('/api/google-sheets/tabs', async (req, res) => {
  try {
    const spreadsheetId = req.query.id as string;
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'Missing spreadsheet id' });
    }

    // Try fetching htmlview first
    let tabs: { name: string; gid: string }[] = [];
    try {
      const htmlRes = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlview`);
      if (htmlRes.ok) {
        const html = await htmlRes.text();
        tabs = parseTabsFromHtml(html);
      }
    } catch {
      // Continue to pubhtml fallback
    }

    // If 0 or 1 tab detected, try pubhtml as fallback to discover any other sub-sheets
    if (tabs.length <= 1) {
      try {
        const pubRes = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/pubhtml`);
        if (pubRes.ok) {
          const pubHtml = await pubRes.text();
          const pubTabs = parseTabsFromHtml(pubHtml);
          for (const pt of pubTabs) {
            if (!tabs.some(t => t.gid === pt.gid)) {
              tabs.push(pt);
            }
          }
        }
      } catch {
        // ignore
      }
    }

    // If still empty, return default main sheet gid 0
    if (tabs.length === 0) {
      tabs.push({ name: 'Sheet 1', gid: '0' });
    }

    res.json({ spreadsheetId, tabs });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// Proxy route to fetch CSV for any tab or sheet name (bypasses CORS in browser)
app.get('/api/google-sheets/csv', async (req, res) => {
  try {
    const { id, gid, sheet } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing spreadsheet id' });

    let targetUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`;
    if (gid) targetUrl += `&gid=${gid}`;
    if (sheet) targetUrl += `&sheet=${encodeURIComponent(sheet as string)}`;

    const response = await fetch(targetUrl);
    if (!response.ok) {
      return res.status(response.status).send(`Failed to fetch CSV: ${response.status}`);
    }

    const csvText = await response.text();
    res.setHeader('Content-Type', 'text/csv');
    res.send(csvText);
  } catch (err: any) {
    res.status(500).send(err?.message || 'Error fetching CSV');
  }
});

// ==========================================
// User Access & Data Isolation Architecture
// ==========================================
const DEFAULT_ADMIN_EMAIL = 'mikerama845@gmail.com';
const ACCESS_FILE = path.join(DATA_DIR, 'users_access.json');
const USERS_DIR = path.join(DATA_DIR, 'users');

if (!fs.existsSync(USERS_DIR)) {
  fs.mkdirSync(USERS_DIR, { recursive: true });
}

function sanitizeEmail(email: string): string {
  if (!email) return 'anonymous';
  return email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
}

function getUserSheetsFile(email: string): string {
  const safeId = sanitizeEmail(email);
  const userDir = path.join(USERS_DIR, safeId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return path.join(userDir, 'saved_sheets.json');
}

const LEGACY_DATA_FILE = path.join(DATA_DIR, 'saved_sheets.json');

// Migrate legacy single saved_sheets.json to admin's private folder
try {
  if (fs.existsSync(LEGACY_DATA_FILE)) {
    const adminSheetsFile = getUserSheetsFile(DEFAULT_ADMIN_EMAIL);
    if (!fs.existsSync(adminSheetsFile)) {
      fs.copyFileSync(LEGACY_DATA_FILE, adminSheetsFile);
    }
  }
} catch {
  // ignore migration error
}

interface UserRecord {
  email: string;
  role: 'admin' | 'user';
  status: 'approved' | 'pending' | 'rejected';
  createdAt: string;
  approvedAt?: string;
  lastActiveAt?: string;
}

function loadUsersAccess(): UserRecord[] {
  try {
    if (fs.existsSync(ACCESS_FILE)) {
      const data = JSON.parse(fs.readFileSync(ACCESS_FILE, 'utf8'));
      if (Array.isArray(data.users)) {
        // Ensure default admin is always present and approved
        if (!data.users.some((u: UserRecord) => u.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase())) {
          data.users.unshift({
            email: DEFAULT_ADMIN_EMAIL,
            role: 'admin',
            status: 'approved',
            createdAt: new Date().toISOString(),
            approvedAt: new Date().toISOString(),
          });
          fs.writeFileSync(ACCESS_FILE, JSON.stringify(data, null, 2));
        }
        return data.users;
      }
    }
  } catch {
    // ignore
  }

  const initial: UserRecord[] = [
    {
      email: DEFAULT_ADMIN_EMAIL,
      role: 'admin',
      status: 'approved',
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
    },
  ];
  try {
    fs.writeFileSync(ACCESS_FILE, JSON.stringify({ users: initial }, null, 2));
  } catch {}
  return initial;
}

function saveUsersAccess(users: UserRecord[]): void {
  // Always guarantee default admin is present & approved
  if (!users.some(u => u.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase())) {
    users.unshift({
      email: DEFAULT_ADMIN_EMAIL,
      role: 'admin',
      status: 'approved',
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
    });
  }
  fs.writeFileSync(ACCESS_FILE, JSON.stringify({ users, updatedAt: new Date().toISOString() }, null, 2));
}

function getRequestUserEmail(req: express.Request): string {
  const headerEmail = (req.headers['x-user-email'] as string) || (req.query.userEmail as string) || '';
  return headerEmail.trim().toLowerCase();
}

function isAdmin(email: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  if (clean === DEFAULT_ADMIN_EMAIL.toLowerCase()) return true;
  const users = loadUsersAccess();
  const u = users.find(x => x.email.toLowerCase() === clean);
  return u?.role === 'admin' && u?.status === 'approved';
}

// ------------------------------------------
// 1. Auth & Access Check Route
// ------------------------------------------
app.post('/api/auth/check-access', (req, res) => {
  try {
    const rawEmail = (req.body?.email || '').trim().toLowerCase();
    if (!rawEmail || !rawEmail.includes('@') || !rawEmail.includes('.')) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const users = loadUsersAccess();
    let user = users.find(u => u.email.toLowerCase() === rawEmail);

    // If default admin, always approved
    if (rawEmail === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
      if (!user) {
        user = {
          email: rawEmail,
          role: 'admin',
          status: 'approved',
          createdAt: new Date().toISOString(),
          approvedAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
        };
        users.unshift(user);
        saveUsersAccess(users);
      } else {
        user.role = 'admin';
        user.status = 'approved';
        user.lastActiveAt = new Date().toISOString();
        saveUsersAccess(users);
      }
      return res.json({
        email: rawEmail,
        role: 'admin',
        status: 'approved',
        approved: true,
      });
    }

    // Existing user
    if (user) {
      user.lastActiveAt = new Date().toISOString();
      saveUsersAccess(users);
      return res.json({
        email: user.email,
        role: user.role,
        status: user.status,
        approved: user.status === 'approved',
      });
    }

    // New user entering email -> Create PENDING request for Admin approval
    const newUser: UserRecord = {
      email: rawEmail,
      role: 'user',
      status: 'pending',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };
    users.push(newUser);
    saveUsersAccess(users);

    return res.json({
      email: rawEmail,
      role: 'user',
      status: 'pending',
      approved: false,
      message: 'Access request submitted. Awaiting approval from admin.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// ------------------------------------------
// 2. Admin User Management Routes
// ------------------------------------------
app.get('/api/admin/users', (req, res) => {
  try {
    const callerEmail = getRequestUserEmail(req);
    if (!isAdmin(callerEmail)) {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }

    const users = loadUsersAccess();
    // Enrich with sheet count for each user
    const enriched = users.map(u => {
      let sheetCount = 0;
      try {
        const uFile = getUserSheetsFile(u.email);
        if (fs.existsSync(uFile)) {
          const d = JSON.parse(fs.readFileSync(uFile, 'utf8'));
          sheetCount = Array.isArray(d.sheets) ? d.sheets.length : 0;
        }
      } catch {}
      return { ...u, sheetCount };
    });

    return res.json({ users: enriched, adminEmail: DEFAULT_ADMIN_EMAIL });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// Approve user access
app.post('/api/admin/users/approve', (req, res) => {
  try {
    const callerEmail = getRequestUserEmail(req);
    if (!isAdmin(callerEmail)) {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }

    const targetEmail = (req.body?.targetEmail || '').trim().toLowerCase();
    if (!targetEmail) return res.status(400).json({ error: 'targetEmail required' });

    const users = loadUsersAccess();
    const user = users.find(u => u.email.toLowerCase() === targetEmail);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.status = 'approved';
    user.approvedAt = new Date().toISOString();
    saveUsersAccess(users);

    return res.json({ success: true, user });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// Revoke user access
app.post('/api/admin/users/revoke', (req, res) => {
  try {
    const callerEmail = getRequestUserEmail(req);
    if (!isAdmin(callerEmail)) {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }

    const targetEmail = (req.body?.targetEmail || '').trim().toLowerCase();
    if (!targetEmail) return res.status(400).json({ error: 'targetEmail required' });
    if (targetEmail === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
      return res.status(400).json({ error: 'Cannot revoke primary admin' });
    }

    const users = loadUsersAccess();
    const user = users.find(u => u.email.toLowerCase() === targetEmail);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.status = 'pending';
    saveUsersAccess(users);

    return res.json({ success: true, user });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// Admin pre-adds a user
app.post('/api/admin/users/add', (req, res) => {
  try {
    const callerEmail = getRequestUserEmail(req);
    if (!isAdmin(callerEmail)) {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }

    const email = (req.body?.email || '').trim().toLowerCase();
    const role = (req.body?.role || 'user') === 'admin' ? 'admin' : 'user';
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const users = loadUsersAccess();
    let existing = users.find(u => u.email.toLowerCase() === email);
    if (existing) {
      existing.status = 'approved';
      existing.role = role;
      existing.approvedAt = new Date().toISOString();
    } else {
      existing = {
        email,
        role,
        status: 'approved',
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
      };
      users.push(existing);
    }
    saveUsersAccess(users);
    return res.json({ success: true, user: existing });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// Admin deletes user
app.delete('/api/admin/users', (req, res) => {
  try {
    const callerEmail = getRequestUserEmail(req);
    if (!isAdmin(callerEmail)) {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }

    const targetEmail = (req.body?.targetEmail || '').trim().toLowerCase();
    if (targetEmail === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
      return res.status(400).json({ error: 'Cannot delete primary admin' });
    }

    const users = loadUsersAccess();
    const filtered = users.filter(u => u.email.toLowerCase() !== targetEmail);
    saveUsersAccess(filtered);

    // Optionally delete their private sheets file
    try {
      const uFile = getUserSheetsFile(targetEmail);
      if (fs.existsSync(uFile)) fs.unlinkSync(uFile);
    } catch {}

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// ------------------------------------------
// 3. Isolated Per-User Sheet Storage Routes
// ------------------------------------------
app.get('/api/sheets', (req, res) => {
  try {
    const userEmail = getRequestUserEmail(req);
    if (!userEmail) {
      return res.status(401).json({ error: 'User email required', sheets: [] });
    }

    const userFile = getUserSheetsFile(userEmail);
    if (fs.existsSync(userFile)) {
      const content = fs.readFileSync(userFile, 'utf8');
      const data = JSON.parse(content);
      return res.json({ sheets: data.sheets || [] });
    }
    return res.json({ sheets: [] });
  } catch {
    return res.json({ sheets: [] });
  }
});

app.post('/api/sheets', (req, res) => {
  try {
    const userEmail = getRequestUserEmail(req);
    if (!userEmail) {
      return res.status(401).json({ error: 'User email required' });
    }

    const { sheets } = req.body;
    if (!Array.isArray(sheets)) {
      return res.status(400).json({ error: 'sheets array is required' });
    }

    const userFile = getUserSheetsFile(userEmail);
    fs.writeFileSync(
      userFile,
      JSON.stringify({ sheets, userEmail, updatedAt: new Date().toISOString() })
    );
    return res.json({ success: true, count: sheets.length });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to save sheets' });
  }
});

app.delete('/api/sheets', (req, res) => {
  try {
    const userEmail = getRequestUserEmail(req);
    if (!userEmail) {
      return res.status(401).json({ error: 'User email required' });
    }

    const userFile = getUserSheetsFile(userEmail);
    if (fs.existsSync(userFile)) {
      fs.unlinkSync(userFile);
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to clear sheets' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
