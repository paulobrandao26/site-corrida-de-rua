/* guarda as inscrições num arquivo JSON.
   No Vercel só /tmp aceita gravação (e é apagado de tempos em tempos):
   para inscrições reais, troque este arquivo por um banco de dados. */
const fs = require('fs');
const path = require('path');

const PASTA = process.env.VERCEL ? '/tmp/eixo-data' : path.join(__dirname, '..', '..', 'data');
const ARQUIVO = path.join(PASTA, 'inscricoes.json');

function listar() {
  try { return JSON.parse(fs.readFileSync(ARQUIVO, 'utf8')); } catch { return []; }
}

function salvarTodas(lista) {
  fs.mkdirSync(PASTA, { recursive: true });
  fs.writeFileSync(ARQUIVO, JSON.stringify(lista, null, 2));
}

function criar(inscricao) {
  const lista = listar();
  lista.push(inscricao);
  salvarTodas(lista);
  return inscricao;
}

function buscar(id) {
  return listar().find(x => x.id === id) || null;
}

function atualizar(id, campos) {
  const lista = listar();
  const i = lista.findIndex(x => x.id === id);
  if (i < 0) return null;
  Object.assign(lista[i], campos);
  salvarTodas(lista);
  return lista[i];
}

module.exports = { listar, criar, buscar, atualizar };
