const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const app = express();

/* ===== CORS ===== */
const allowedOrigins = new Set([
  'https://moparpagamentos.com.br',
  'https://www.moparpagamentos.com.br',
  'http://moparpagamentos.com.br',
  'http://www.moparpagamentos.com.br',
  'http://localhost:3000',
  'http://localhost:5173'
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@test.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456';

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;
const DB_TABLE = process.env.DB_TABLE || 'usuarios';
const DB_EMAIL_COLUMN = process.env.DB_EMAIL_COLUMN || 'email';
const DB_PASSWORD_COLUMN = process.env.DB_PASSWORD_COLUMN || 'senha';

const dbPool = DB_HOST && DB_USER && DB_PASSWORD && DB_NAME
  ? mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  })
  : null;

/* ===== ROTAS ===== */
app.get('/', (req, res) => {
  res.send('API Mopar Pagamentos rodando 🚀');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/* 👉 ROTA DE LOGIN (ESSA ESTAVA FALTANDO) */
app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    if (!email || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Informe email e senha'
      });
    }

    if (dbPool) {
      const [rows] = await dbPool.query(
        'SELECT ?? AS password FROM ?? WHERE ?? = ? LIMIT 1',
        [DB_PASSWORD_COLUMN, DB_TABLE, DB_EMAIL_COLUMN, email]
      );

      if (rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas'
        });
      }

      const dbPassword = rows[0].password;
      const isBcrypt = typeof dbPassword === 'string' && dbPassword.startsWith('$2');
      const passwordOk = isBcrypt
        ? await bcrypt.compare(senha, dbPassword)
        : senha === dbPassword;

      if (!passwordOk) {
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas'
        });
      }

      return res.json({
        success: true,
        token: 'fake-jwt-token'
      });
    }

    // Fallback simples se DB não estiver configurado
    if (email === ADMIN_EMAIL && senha === ADMIN_PASSWORD) {
      return res.json({
        success: true,
        token: 'fake-jwt-token'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Credenciais inválidas'
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno no login'
    });
  }
});

/* ===== PORTA (OBRIGATÓRIO NA HOSTINGER) ===== */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API Mopar rodando na porta ${PORT}`);
});
