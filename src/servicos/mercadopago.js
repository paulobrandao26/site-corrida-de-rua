/* tudo que fala com o Mercado Pago fica aqui */
const crypto = require('crypto');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { ACCESS_TOKEN, WEBHOOK_SECRET, BASE_URL, HTTPS, DEMO } = require('../config');
const inscricoes = require('../repositorios/inscricoes');

const mp = DEMO ? null : new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });

/* cria o link de pagamento (Checkout Pro) */
async function criarPagamento({ id, dados, prova }) {
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
    ...(HTTPS ? { auto_return: 'approved', notification_url: `${BASE_URL}/api/webhook-mercadopago` } : {})
  } });
  return pref;
}

function buscarPagamento(id) {
  return new Payment(mp).get({ id });
}

/* só marca como pago se o valor e a moeda batem com a inscrição */
function aplicarPagamento(pay) {
  const id = pay.external_reference;
  if (!id) return null;
  const insc = inscricoes.buscar(id);
  if (!insc) return null;
  let status = pay.status;
  if (status === 'approved' && (pay.currency_id !== 'BRL' || Number(pay.transaction_amount) < insc.valor)) {
    console.warn('Pagamento com valor diferente do esperado:', pay.id);
    status = 'valor_divergente';
  }
  return inscricoes.atualizar(id, { status, paymentId: pay.id });
}

/* confere a assinatura do aviso (webhook) do Mercado Pago */
function assinaturaValida(req, dataId) {
  if (!WEBHOOK_SECRET) return true;
  const sig = String(req.get('x-signature') || '');
  const ts = (sig.match(/ts=([^,]+)/) || [])[1];
  const v1 = (sig.match(/v1=([^,]+)/) || [])[1];
  const manifest = `id:${dataId.toLowerCase()};request-id:${req.get('x-request-id') || ''};ts:${ts};`;
  const esperado = crypto.createHmac('sha256', WEBHOOK_SECRET).update(manifest).digest('hex');
  return !!v1 && !!ts && v1.length === esperado.length && crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(esperado));
}

module.exports = { criarPagamento, buscarPagamento, aplicarPagamento, assinaturaValida };
