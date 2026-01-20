import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import mysql from 'mysql2/promise';

dotenv.config();

// Mapeamento das variáveis de ambiente da Hostinger
const {
  PORT = 3001,
  DB_HOST,
  DB_USER,
  DB_PASS,
  DB_NAME,
  CORS_ORIGINS
} = process.env;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- CONFIGURAÇÃO DE CORS (CORRIGIDA) ---
const allowedOrigins = (CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Garante domínios essenciais, mesmo com env definida
const defaultOrigins = [
  'https://moparpagamentos.com.br',
  'https://www.moparpagamentos.com.br'
];

for (const origin of defaultOrigins) {
  if (!allowedOrigins.includes(origin)) {
    allowedOrigins.push(origin);
  }
}

// Permite qualquer subdomínio de moparpagamentos.com.br
const moparSubdomainRegex = /^https:\/\/([a-z0-9-]+\.)*moparpagamentos\.com\.br$/i;

const isAllowedOrigin = (origin) =>
  allowedOrigins.includes(origin) || moparSubdomainRegex.test(origin);

// Define cabeçalhos CORS antes de qualquer rota
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    );
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    );
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
});

app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem origin (como mobile ou Postman)
    if (!origin) return callback(null, true);

    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    console.warn(`CORS bloqueou acesso de: ${origin}`);
    return callback(new Error('Origin não permitido pelo CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 204
}));

app.use(express.json());

// --- CONFIGURAÇÃO DO BANCO DE DADOS ---
const dbConfig = {
  host: DB_HOST || '127.0.0.1',
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10
};

let db;
try {
  db = await mysql.createPool(dbConfig);
  console.log('Pool de conexão MySQL criado.');
} catch (error) {
  console.error('Erro ao configurar Pool do banco:', error);
}

// --- ROTAS DA API ---

// 1. Healthcheck
app.get('/api/healthcheck', async (req, res) => {
  try {
    if (!db) throw new Error('Banco de dados não inicializado');
    const [result] = await db.execute('SELECT 1 + 1 AS result');
    res.json({ 
      status: 'online', 
      database: 'conectado', 
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    res.status(500).json({ status: 'erro', message: error.message });
  }
});

// 2. Listar Sócios
app.get('/api/socios', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Banco indisponível' });
    const [rows] = await db.execute('SELECT * FROM socios ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Login
app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    if (!db) return res.status(500).json({ success: false, message: 'Banco indisponível' });
    const [rows] = await db.execute(
      'SELECT id, nome, nivel_acesso FROM usuarios WHERE email = ? AND senha = ?',
      [email, senha]
    );
    if (rows.length > 0) return res.json({ success: true, user: rows[0] });
    res.status(401).json({ success: false, message: 'Credenciais inválidas' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- BARREIRA DE SEGURANÇA PARA API ---
// Se chegar aqui com /api/ e não pegou nenhuma rota acima, retorna 404 JSON
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `Rota ${req.method} ${req.url} não encontrada.` });
});

// --- SERVIR FRONTEND ---
const staticDir = path.join(__dirname, 'dist');
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));
  
  // Qualquer rota que não seja da API, entrega o index.html (SPA do React)
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });
} else {
  // Rota padrão caso o site ainda não tenha sido buildado
  app.get('/', (req, res) => {
    res.send('API Mopar Pagamentos rodando 🚀 (Aguardando build do frontend)');
  });
}

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
