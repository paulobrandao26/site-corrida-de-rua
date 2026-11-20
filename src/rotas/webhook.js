/* webhook: o Mercado Pago avisa quando o pagamento muda */
const { Router } = require('express');
const { DEMO } = require('../config');
const mercadopago = require('../servicos/mercadopago');

const rotas = Router();

rotas.post('/webhook-mercadopago', async (req, res) => {
  const dataId = String(req.query['data.id'] || req.body?.data?.id || '');
  if (!mercadopago.assinaturaValida(req, dataId)) return res.sendStatus(401);

  const tipo = req.query.type || req.body?.type;
  if (tipo === 'payment' && /^\d+$/.test(dataId) && !DEMO) {
    try {
      const pay = await mercadopago.buscarPagamento(dataId);
      mercadopago.aplicarPagamento(pay);
      console.log('Pagamento', pay.id, pay.status);
    } catch (err) { console.error('Webhook:', err?.message || err); }
  }
  res.sendStatus(200);
});

module.exports = rotas;
