import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("database.sqlite");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  );
  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    userId INTEGER,
    title TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chatId TEXT,
    role TEXT,
    content TEXT,
    type TEXT DEFAULT 'text',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(chatId) REFERENCES chats(id)
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  const PORT = 3000;

  // Auth Routes
  app.post("/api/auth/register", (req, res) => {
    const { username, password } = req.body;
    try {
      const info = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(username, password);
      res.json({ id: info.lastInsertRowid, username });
    } catch (e) {
      res.status(400).json({ error: "Username already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;
    if (user) {
      res.json({ id: user.id, username: user.username });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Chat Routes
  app.get("/api/chats/:userId", (req, res) => {
    const chats = db.prepare("SELECT * FROM chats WHERE userId = ? ORDER BY createdAt DESC").all(req.params.userId);
    res.json(chats);
  });

  app.post("/api/chats", (req, res) => {
    const { id, userId, title } = req.body;
    db.prepare("INSERT INTO chats (id, userId, title) VALUES (?, ?, ?)").run(id, userId, title);
    res.json({ id, userId, title });
  });

  app.get("/api/messages/:chatId", (req, res) => {
    const messages = db.prepare("SELECT * FROM messages WHERE chatId = ? ORDER BY createdAt ASC").all(req.params.chatId);
    res.json(messages);
  });

  app.post("/api/messages", (req, res) => {
    const { chatId, role, content, type } = req.body;
    db.prepare("INSERT INTO messages (chatId, role, content, type) VALUES (?, ?, ?, ?)").run(chatId, role, content, type || 'text');
    res.json({ success: true });
  });

  app.delete("/api/chats/:chatId", (req, res) => {
    db.prepare("DELETE FROM messages WHERE chatId = ?").run(req.params.chatId);
    db.prepare("DELETE FROM chats WHERE id = ?").run(req.params.chatId);
    res.json({ success: true });
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
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
