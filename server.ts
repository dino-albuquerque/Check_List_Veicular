import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import nodemailer from "nodemailer";

const db = new Database("users.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS inspections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    protocol TEXT UNIQUE NOT NULL,
    inspector_email TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Inspections Endpoints
  app.post("/api/inspections", (req, res) => {
    const { protocol, inspector_email, data } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO inspections (protocol, inspector_email, data) VALUES (?, ?, ?)");
      stmt.run(protocol, inspector_email, JSON.stringify(data));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao salvar vistoria" });
    }
  });

  // Auth Endpoints
  app.post("/api/register", (req, res) => {
    const { name, email, password } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
      stmt.run(name, email, password);
      res.json({ success: true });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        res.status(400).json({ error: "E-mail já cadastrado" });
      } else {
        res.status(500).json({ error: "Erro ao cadastrar usuário" });
      }
    }
  });

  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password) as any;
    if (user) {
      res.json({ success: true, user: { name: user.name, email: user.email } });
    } else {
      res.status(401).json({ error: "E-mail ou senha inválidos" });
    }
  });

  // Email Endpoint (Mocked for demo but with real structure)
  app.post("/api/send-email", async (req, res) => {
    const { to, pdfBase64, protocol } = req.body;
    
    // In a real scenario, you'd configure a real transporter
    // For this demo, we'll simulate the success
    console.log(`Simulating email send to: ${to} for protocol: ${protocol}`);
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    res.json({ success: true, message: "Relatório enviado com sucesso!" });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
