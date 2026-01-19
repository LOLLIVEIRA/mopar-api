const express = require('express');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API Mopar Pagamentos rodando 🚀');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ⚠️ OBRIGATÓRIO usar process.env.PORT
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API Mopar rodando na porta ${PORT}`);
});
