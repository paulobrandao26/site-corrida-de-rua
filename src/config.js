/* configurações vindas do ambiente (.env no PC, variáveis no Vercel) e regras fixas da prova */
const PORT = process.env.PORT || 3001;
const VERCEL_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '';
const BASE_URL = (process.env.BASE_URL || VERCEL_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || '';
const WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || '';

/* preços oficiais — o navegador nunca decide o valor */
const PROVAS = {
  '5':  { nome: 'Corrida 5K',        preco: 89 },
  '10': { nome: 'Corrida 10K',       preco: 119 },
  '21': { nome: 'Meia Maratona 21K', preco: 179 }
};
const CAMISETAS = ['P', 'M', 'G', 'GG', 'XG'];

/* status que contam como inscrição confirmada */
const CONFIRMADOS = ['approved', 'teste_sem_cobranca'];

module.exports = {
  PORT, BASE_URL, ACCESS_TOKEN, WEBHOOK_SECRET,
  DEMO: !ACCESS_TOKEN,
  HTTPS: BASE_URL.startsWith('https://'),
  PROVAS, CAMISETAS, CONFIRMADOS
};
