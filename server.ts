import express from "express";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Connect to Supabase using the DATABASE_URL from Render Environment Variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize Database Tables in Supabase
const initDb = async () => {
  const client = await pool.connect();
  try {
    // Create Orders Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        service_type TEXT,
        quantity INTEGER,
        price INTEGER,
        reel_url TEXT,
        utr_number TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Settings Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    // Set default server status to 'open'
    await client.query(`
      INSERT INTO settings (key, value) 
      VALUES ('server_status', 'open') 
      ON CONFLICT (key) DO NOTHING;
    `);

    console.log("Supabase Database Initialized Successfully!");
  } catch (err) {
    console.error("Database Initialization Error:", err);
  } finally {
    client.release();
  }
};

initDb();

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json());

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Get Server Status
  app.get("/api/settings/server-status", async (req, res) => {
    try {
      const result = await pool.query("SELECT value FROM settings WHERE key = 'server_status'");
      res.json({ status: result.rows[0]?.value || 'open' });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch status" });
    }
  });

  // Update Server Status (Admin Only)
  app.patch("/api/settings/server-status", async (req, res) => {
    const adminCode = req.headers["x-admin-code"];
    if (adminCode !== "2563123456789") return res.status(403).json({ error: "Unauthorized" });
    
    const { status } = req.body;
    try {
      await pool.query("UPDATE settings SET value = $1 WHERE key = 'server_status'", [status]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // Create New Order
  app.post("/api/orders", async (req, res) => {
    const { id, service_type, quantity, price, reel_url, utr_number } = req.body;
    try {
      await pool.query(
        "INSERT INTO orders (id, service_type, quantity, price, reel_url, utr_number) VALUES ($1, $2, $3, $4, $5, $6)",
        [id, service_type, quantity, price, reel_url, utr_number]
      );
      
      // Telegram Notification
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (botToken && chatId) {
        const message = `🚀 *New Order Received!*\n\nID: ${id}\nService: ${service_type}\nQty: ${quantity}\nPrice: ₹${price}\nUTR: ${utr_number}\nLink: ${reel_url}`;
        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: message })
        }).catch(e => console.error("Telegram error:", e));
      }

      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Order Error:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // Get All Orders (Admin Only)
  app.get("/api/orders", async (req, res) => {
    const adminCode = req.headers["x-admin-code"];
    if (adminCode !== "2563123456789") return res.status(403).json({ error: "Unauthorized" });
    
    try {
      const result = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Get Single Order Status
  app.get("/api/orders/:id", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM orders WHERE id = $1", [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // Get Batch Orders (History)
  app.post("/api/orders/batch", async (req, res) => {
    const { ids } = req.body;
    try {
      const result = await pool.query("SELECT * FROM orders WHERE id = ANY($1) ORDER BY created_at DESC", [ids]);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // Approve Order (Admin Only)
  app.patch("/api/orders/:id/approve", async (req, res) => {
    const adminCode = req.headers["x-admin-code"];
    if (adminCode !== "2563123456789") return res.status(403).json({ error: "Unauthorized" });
    
    try {
      await pool.query("UPDATE orders SET status = 'approved' WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to approve" });
    }
  });

  // Serve Frontend
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
