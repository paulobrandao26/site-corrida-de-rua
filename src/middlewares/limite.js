/* limite simples: 10 tentativas por minuto por IP */
const tentativas = new Map();

function limite(req, res, next) {
  const ip = req.ip, agora = Date.now();
  const lista = (tentativas.get(ip) || []).filter(t => agora - t < 60000);
  if (lista.length >= 10) return res.status(429).json({ erro: 'Muitas tentativas. Aguarde 1 minuto.' });
  lista.push(agora);
  tentativas.set(ip, lista);
  next();
}

setInterval(() => tentativas.clear(), 10 * 60000).unref();

module.exports = limite;
