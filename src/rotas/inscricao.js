/* inscrição e consulta de pagamento */
const crypto = require('crypto');
const { Router } = require('express');
const { PROVAS, CONFIRMADOS, BASE_URL, DEMO } = require('../config');
const { validarInscricao } = require('../validacao/inscricao');
const inscricoes = require('../repositorios/inscricoes');
const mercadopago = require('../servicos/mercadopago');
const limite = require('../middlewares/limite');

const rotas = Router();

rotas.post('/inscricao', limite, async (req, res) => {
  const { erros, dados } = validarInscricao(req.body || {});
  if (erros.length) return res.status(400).json({ erro: 'Dados inválidos', campos: erros });

  if (inscricoes.listar().some(x => x.cpf === dados.cpf && x.prova === dados.prova && CONFIRMADOS.includes(x.status))) {
    return res.status(409).json({ erro: 'Este CPF já está inscrito nesta prova.' });
  }

  const prova = PROVAS[dados.prova];
  const id = crypto.randomUUID();
  inscricoes.criar({ id, ...dados, valor: prova.preco, status: 'aguardando_pagamento', criadoEm: new Date().toISOString() });

  if (DEMO) {
    inscricoes.atualizar(id, { status: 'teste_sem_cobranca' });
    return res.json({ demo: true, url: `${BASE_URL}/?status=teste&ref=${id}` });
  }

  try {
    const pref = await mercadopago.criarPagamento({ id, dados, prova });
    inscricoes.atualizar(id, { preferenceId: pref.id });
    res.json({ url: pref.init_point });
  } catch (err) {
    console.error('Erro ao criar pagamento:', err?.message || err);
    res.status(502).json({ erro: 'Não foi possível abrir o pagamento agora.' });
  }
});

/* consulta o status direto no Mercado Pago (não confia no que veio na URL) */
rotas.get('/pagamento/:id', limite, async (req, res) => {
  if (DEMO) return res.json({ status: 'teste' });
  if (!/^\d{1,20}$/.test(req.params.id)) return res.status(400).json({ erro: 'id inválido' });
  try {
    const pay = await mercadopago.buscarPagamento(req.params.id);
    const insc = mercadopago.aplicarPagamento(pay);
    res.json({ status: insc ? insc.status : 'desconhecido' }); // só o status, nenhum dado pessoal
  } catch {
    res.status(502).json({ erro: 'Não foi possível consultar o pagamento.' });
  }
});

module.exports = rotas;
