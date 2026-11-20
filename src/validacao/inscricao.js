/* confere e limpa os dados que chegam do formulário */
const { PROVAS, CAMISETAS } = require('../config');

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

function validarInscricao(b) {
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

module.exports = { cpfValido, validarInscricao };
