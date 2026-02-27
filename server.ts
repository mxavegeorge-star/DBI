import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Database path configuration for hosting
let DB_PATH = "orders.db";

if (process.env.NODE_ENV === "production") {
  if (process.env.DATABASE_PATH) {
    DB_PATH = process.env.DATABASE_PATH;
  } else {
    // Try to use /var/data if it exists (Render Disk), otherwise fallback to local
    const preferredPath = "/var/data/orders.db";
    const preferredDir = path.dirname(preferredPath);
    
    if (fs.existsSync(preferredDir)) {
      DB_PATH = preferredPath;
    } else {
      try {
        // Try to create it, if it fails, we stay with "orders.db"
        fs.mkdirSync(preferredDir, { recursive: true });
        DB_PATH = preferredPath;
      } catch (err) {
        console.warn("Could not use /var/data, falling back to local storage. Orders will not persist across restarts on Free tier.");
        DB_PATH = "orders.db";
      }
    }
  }
}

const db = new Database(DB_PATH);

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    service_type TEXT,
    package_id TEXT,
    quantity INTEGER,
    price INTEGER,
    reel_url TEXT,
    utr_number TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES ('server_status', 'open');
`);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json());

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", environment: process.env.NODE_ENV || 'development' });
  });

  // API Routes
  app.get("/api/settings/server-status", (req, res) => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'server_status'").get();
    res.json({ status: row ? row.value : 'open' });
  });

  app.patch("/api/settings/server-status", (req, res) => {
    const adminCode = req.headers["x-admin-code"];
    console.log(`[Admin] Server status change request. Admin code provided: ${adminCode ? 'Yes' : 'No'}`);
    if (adminCode !== "2563123456789") {
      console.error("[Admin] Unauthorized server status change attempt");
      return res.status(403).json({ error: "Unauthorized" });
    }
    const { status } = req.body;
    console.log(`[Admin] Updating server status to: ${status}`);
    db.prepare("UPDATE settings SET value = ? WHERE key = 'server_status'").run(status);
    res.json({ success: true });
  });

  app.post("/api/orders", (req, res) => {
    const { id, service_type, package_id, quantity, price, reel_url, utr_number } = req.body;
    console.log(`[Order] New order request: ${id}, UTR: ${utr_number}`);
    try {
      const stmt = db.prepare(`
        INSERT INTO orders (id, service_type, package_id, quantity, price, reel_url, utr_number)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, service_type, package_id, quantity, price, reel_url, utr_number);
      
      // Send Telegram Notification (Optional)
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (botToken && chatId) {
        const message = `
🚀 *New Order Received!*
------------------------
🆔 *ID:* ${id}
🛠 *Service:* ${service_type}
📦 *Package:* ${quantity.toLocaleString()}
💰 *Price:* ₹${price}
🔗 *Link:* ${reel_url}
💳 *UTR:* ${utr_number}

Check admin panel to approve!
        `;
        
        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown'
          })
        }).catch(err => console.error("Telegram notification failed", err));
      }

      res.status(201).json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.get("/api/orders", (req, res) => {
    const adminCode = req.headers["x-admin-code"];
    if (adminCode !== "2563123456789") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    const orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
    res.json(orders);
  });

  app.get("/api/orders/:id", (req, res) => {
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  });

  app.post("/api/orders/batch", (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "Invalid IDs" });
    
    const placeholders = ids.map(() => "?").join(",");
    const orders = db.prepare(`SELECT * FROM orders WHERE id IN (${placeholders}) ORDER BY created_at DESC`).all(...ids);
    res.json(orders);
  });

  app.patch("/api/orders/:id/approve", (req, res) => {
    const adminCode = req.headers["x-admin-code"];
    if (adminCode !== "2563123456789") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      db.prepare("UPDATE orders SET status = 'approved' WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to approve order" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
