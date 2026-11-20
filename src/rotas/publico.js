/* dados públicos: configuração, lista de inscritos e ranking */
const fs = require('fs');
const path = require('path');
const { Router } = require('express');
const { DEMO, PROVAS, CONFIRMADOS } = require('../config');
const inscricoes = require('../repositorios/inscricoes');

const rotas = Router();

rotas.get('/config', (req, res) => res.json({ demo: DEMO, provas: PROVAS }));

/* SÓ o nome, e só de quem já está confirmado */
rotas.get('/inscritos', (req, res) => {
  const nomes = inscricoes.listar()
    .filter(i => CONFIRMADOS.includes(i.status))
    .map(i => i.nome)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  res.json({ total: nomes.length, nomes });
});

/* ranking: crie data/ranking.json depois da prova.
   Enquanto ele não existir, mostra o exemplo marcado como EXEMPLO. */
const RANKING_REAL = path.join(__dirname, '..', '..', 'data', 'ranking.json');
const RANKING_EXEMPLO = path.join(__dirname, '..', 'dados', 'ranking-exemplo.json');

rotas.get('/ranking', (req, res) => {
  try {
    if (fs.existsSync(RANKING_REAL)) return res.json({ exemplo: false, ...JSON.parse(fs.readFileSync(RANKING_REAL, 'utf8')) });
    return res.json({ exemplo: true, ...require(RANKING_EXEMPLO) });
  } catch {
    res.json({ exemplo: false, provas: {} });
  }
});

module.exports = rotas;
