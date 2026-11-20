/* erro genérico: nunca mostra detalhes internos para o visitante */
function erros(err, req, res, next) {
  console.error(err?.message || err);
  res.status(err?.status === 400 ? 400 : 500).json({ erro: 'Não foi possível processar o pedido.' });
}

module.exports = erros;
