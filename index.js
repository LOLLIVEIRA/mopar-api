const express = require('express');
const cors = require('cors');

const app = express();

/* ===== CORS ===== */
app.use(cors({
  origin: [
    'https://moparpagamentos.com.br',
    'https://www.moparpagamentos.com.br'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

/* ===== ROTAS ===== */
app.get('/', (req, res) => {
  res.send('API Mopar Pagamentos rodando 🚀');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/* 👉 ROTA DE LOGIN (ESSA ESTAVA FALTANDO) */
app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;

  // TESTE SIMPLES (depois você troca por banco)
  if (email === 'admin@test.com' && senha === '123456') {
    return res.json({
      success: true,
      token: 'fake-jwt-token'
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Credenciais inválidas'
  });
});

/* ===== PORTA (OBRIGATÓRIO NA HOSTINGER) ===== */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API Mopar rodando na porta ${PORT}`);
});
