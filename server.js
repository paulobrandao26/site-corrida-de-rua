/**
 * EIXO RUN — servidor do site + pagamento Mercado Pago (Checkout Pro)
 * ------------------------------------------------------------------
 * Segurança:
 *  - O preço é definido AQUI no servidor (o navegador só manda a prova escolhida).
 *  - O Access Token fica no arquivo .env (fora do código e fora do Git).
 *  - O pagamento acontece na página do Mercado Pago: o cartão nunca passa por este site.
 *  - A confirmação vem do próprio Mercado Pago (webhook + consulta), não do navegador.
 *
 * Como rodar:
 *  1) npm install
 *  2) copie .env.example para .env e preencha MP_ACCESS_TOKEN
 *     (sem token o site roda em MODO TESTE, sem cobrar nada)
 *  3) npm start  ->  http://localhost:3001
 */
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

const PORT = process.env.PORT || 3001;
const VERCEL_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '';
const BASE_URL = (process.env.BASE_URL || VERCEL_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || '';
const WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || '';
const DEMO = !ACCESS_TOKEN;

/* preços oficiais — o navegador nunca decide o valor */
const PROVAS = {
  '5':  { nome: 'Corrida 5K',        preco: 89 },
  '10': { nome: 'Corrida 10K',       preco: 119 },
  '21': { nome: 'Meia Maratona 21K', preco: 179 }
};
const CAMISETAS = ['P', 'M', 'G', 'GG', 'XG'];

const mp = DEMO ? null : new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });

/* ---------- inscrições (arquivo simples; troque por banco de dados em produção) ---------- */
/* no Vercel só /tmp aceita gravação (e é apagado de tempos em tempos) — use um banco de dados para inscrições reais */
const DATA_DIR = process.env.VERCEL ? '/tmp/eixo-data' : path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'inscricoes.json');
function lerInscricoes() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return []; }
}
function salvarInscricoes(lista) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(lista, null, 2));
}
function atualizarInscricao(id, campos) {
  const lista = lerInscricoes();
  const i = lista.findIndex(x => x.id === id);
  if (i >= 0) { Object.assign(lista[i], campos); salvarInscricoes(lista); return lista[i]; }
  return null;
}

/* ---------- validação ---------- */
function cpfValido(cpf) {
  cpf = String(cpf || '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let s = 0; for (let i = 0; i < 9; i++) s += +cpf[i] * (10 - i);
  let r = (s * 10) % 11; if (r === 10) r = 0;
  if (r !== +cpf[9]) return false;
  s = 0; for (let i = 0; i < 10; i++) s += +cpf[i] * (11 - i);
  r = (s * 10) % 11; if (r === 10) r = 0;
  return r === +cpf[10];
}
function validar(b) {
  const erros = [];
  const nome = String(b.nome || '').trim().replace(/\s+/g, ' ');
  const email = String(b.email || '').trim().toLowerCase();
  const tel = String(b.tel || '').replace(/\D/g, '');
  const nasc = String(b.nasc || '');
  const idade = (Date.now() - new Date(nasc)) / 31557600000;
  if (nome.split(' ').length < 2 || nome.length > 100 || !/^[\p{L}][\p{L}' .-]*$/u.test(nome)) erros.push('nome');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) erros.push('email');
  if (!cpfValido(b.cpf)) erros.push('cpf');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nasc) || !(idade >= 16 && idade < 110)) erros.push('nasc');
  if (tel.length < 10 || tel.length > 11) erros.push('tel');
  if (typeof b.prova !== 'string' || !Object.hasOwn(PROVAS, b.prova)) erros.push('prova');
  if (!CAMISETAS.includes(b.camiseta)) erros.push('camiseta');
  if (b.termos !== true) erros.push('termos');
  return { erros, dados: {
    nome, email, tel, nasc,
    cpf: String(b.cpf).replace(/\D/g, ''),
    prova: b.prova, camiseta: b.camiseta,
    equipe: String(b.equipe || '').trim().slice(0, 60)
  } };
}

/* ---------- app ---------- */
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // pega o IP real atrás do Vercel/proxy (usado no limite de tentativas)
app.use(express.json({ limit: '10kb' }));
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src https://fonts.gstatic.com",
      "img-src 'self' https://images.unsplash.com data:",
      "connect-src 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'"
    ].join('; ')
  });
  if (BASE_URL.startsWith('https://')) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

/* limite simples: 10 tentativas por minuto por IP */
const tentativas = new Map();
function limite(req, res, next) {
  const ip = req.ip, agora = Date.now();
  const lista = (tentativas.get(ip) || []).filter(t => agora - t < 60000);
  if (lista.length >= 10) return res.status(429).json({ erro: 'Muitas tentativas. Aguarde 1 minuto.' });
  lista.push(agora); tentativas.set(ip, lista); next();
}
setInterval(() => tentativas.clear(), 10 * 60000).unref();

/* só marca como pago se o valor e a moeda batem com a inscrição */
function aplicarPagamento(pay) {
  const id = pay.external_reference;
  if (!id) return null;
  const insc = lerInscricoes().find(x => x.id === id);
  if (!insc) return null;
  let status = pay.status;
  if (status === 'approved' && (pay.currency_id !== 'BRL' || Number(pay.transaction_amount) < insc.valor)) {
    console.warn('Pagamento com valor diferente do esperado:', pay.id);
    status = 'valor_divergente';
  }
  return atualizarInscricao(id, { status, paymentId: pay.id });
}

app.get('/api/config', (req, res) => res.json({ demo: DEMO, provas: PROVAS }));

app.post('/api/inscricao', limite, async (req, res) => {
  const { erros, dados } = validar(req.body || {});
  if (erros.length) return res.status(400).json({ erro: 'Dados inválidos', campos: erros });

  const prova = PROVAS[dados.prova];
  const id = crypto.randomUUID();
  const lista = lerInscricoes();
  if (lista.some(x => x.cpf === dados.cpf && x.prova === dados.prova && CONFIRMADOS.includes(x.status))) {
    return res.status(409).json({ erro: 'Este CPF já está inscrito nesta prova.' });
  }
  lista.push({ id, ...dados, valor: prova.preco, status: 'aguardando_pagamento', criadoEm: new Date().toISOString() });
  salvarInscricoes(lista);

  if (DEMO) {
    atualizarInscricao(id, { status: 'teste_sem_cobranca' });
    return res.json({ demo: true, url: `${BASE_URL}/?status=teste&ref=${id}` });
  }

  try {
    const https = BASE_URL.startsWith('https://');
    const pref = await new Preference(mp).create({ body: {
      items: [{ id: `prova-${dados.prova}`, title: `Eixo Run 2026 — ${prova.nome}`, quantity: 1, unit_price: prova.preco, currency_id: 'BRL' }],
      payer: { email: dados.email, name: dados.nome.split(' ')[0] },
      external_reference: id,
      statement_descriptor: 'EIXORUN',
      back_urls: {
        success: `${BASE_URL}/?status=aprovado`,
        pending: `${BASE_URL}/?status=pendente`,
        failure: `${BASE_URL}/?status=recusado`
      },
      ...(https ? { auto_return: 'approved', notification_url: `${BASE_URL}/api/webhook-mercadopago` } : {})
    } });
    atualizarInscricao(id, { preferenceId: pref.id });
    res.json({ url: pref.init_point });
  } catch (err) {
    console.error('Erro ao criar pagamento:', err?.message || err);
    res.status(502).json({ erro: 'Não foi possível abrir o pagamento agora.' });
  }
});

/* consulta o status direto no Mercado Pago (não confia no que veio na URL) */
app.get('/api/pagamento/:id', limite, async (req, res) => {
  if (DEMO) return res.json({ status: 'teste' });
  if (!/^\d{1,20}$/.test(req.params.id)) return res.status(400).json({ erro: 'id inválido' });
  try {
    const pay = await new Payment(mp).get({ id: req.params.id });
    const insc = aplicarPagamento(pay);
    res.json({ status: insc ? insc.status : 'desconhecido' }); // só o status, nenhum dado pessoal
  } catch (err) {
    res.status(502).json({ erro: 'Não foi possível consultar o pagamento.' });
  }
});

/* webhook: o Mercado Pago avisa quando o pagamento muda */
app.post('/api/webhook-mercadopago', async (req, res) => {
  const dataId = String(req.query['data.id'] || req.body?.data?.id || '');
  if (WEBHOOK_SECRET) {
    const sig = String(req.get('x-signature') || '');
    const ts = (sig.match(/ts=([^,]+)/) || [])[1];
    const v1 = (sig.match(/v1=([^,]+)/) || [])[1];
    const manifest = `id:${dataId.toLowerCase()};request-id:${req.get('x-request-id') || ''};ts:${ts};`;
    const esperado = crypto.createHmac('sha256', WEBHOOK_SECRET).update(manifest).digest('hex');
    if (!v1 || !ts || v1.length !== esperado.length || !crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(esperado))) {
      return res.sendStatus(401);
    }
  }
  const tipo = req.query.type || req.body?.type;
  if (tipo === 'payment' && /^\d+$/.test(dataId) && !DEMO) {
    try {
      const pay = await new Payment(mp).get({ id: dataId });
      aplicarPagamento(pay);
      console.log('Pagamento', pay.id, pay.status);
    } catch (err) { console.error('Webhook:', err?.message || err); }
  }
  res.sendStatus(200);
});

/* lista pública de inscritos: SÓ o nome, e só de quem já está confirmado */
const CONFIRMADOS = ['approved', 'teste_sem_cobranca'];
app.get('/api/inscritos', (req, res) => {
  const nomes = lerInscricoes()
    .filter(i => CONFIRMADOS.includes(i.status))
    .map(i => i.nome)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  res.json({ total: nomes.length, nomes });
});

/* ranking: edite data/ranking.json depois da prova.
   Enquanto ele não existir, mostra ranking-exemplo.json marcado como EXEMPLO. */
app.get('/api/ranking', (req, res) => {
  const real = path.join(__dirname, 'data', 'ranking.json');
  const exemplo = path.join(__dirname, 'ranking-exemplo.json');
  try {
    if (fs.existsSync(real)) return res.json({ exemplo: false, ...JSON.parse(fs.readFileSync(real, 'utf8')) });
    return res.json({ exemplo: true, ...JSON.parse(fs.readFileSync(exemplo, 'utf8')) });
  } catch {
    res.json({ exemplo: false, provas: {} });
  }
});

/* site: só a pasta public (nada de .env, server.js ou data/) */
app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'deny' }));

/* erro genérico: nunca mostra detalhes internos para o visitante */
app.use((err, req, res, next) => {
  console.error(err?.message || err);
  res.status(err?.status === 400 ? 400 : 500).json({ erro: 'Não foi possível processar o pedido.' });
});

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Eixo Run em ${BASE_URL}`);
    console.log(DEMO ? 'MODO TESTE: sem MP_ACCESS_TOKEN, nada é cobrado.' : 'Mercado Pago ativo.');
    if (!DEMO && !WEBHOOK_SECRET) console.warn('Atenção: defina MP_WEBHOOK_SECRET para validar os avisos do Mercado Pago.');
  });
}
