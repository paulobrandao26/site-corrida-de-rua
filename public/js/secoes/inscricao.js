/* formulário em 3 etapas, pagamento e volta do Mercado Pago */
import { $, $$, esc, rolarAte } from '../utils.js';
import { REGRAS, checar, iniciarValidacao } from '../validacao.js';

const PROVAS = { '5': ['Corrida 5K', 89], '10': ['Corrida 10K', 119], '21': ['Meia Maratona 21K', 179] };
const LABELS = { 1: 'escolha a prova', 2: 'seus dados', 3: 'falta só pagar' };

const dados = () => ({
  prova: $('input[name="prova"]:checked').value,
  camiseta: $('input[name="camiseta"]:checked').value,
  nome: $('#inNome').value.trim(),
  email: $('#inEmail').value.trim(),
  tel: $('#inTel').value,
  cpf: $('#inCpf').value,
  nasc: $('#inNasc').value,
  termos: $('#inTermos').checked
});

function montarResumo() {
  const d = dados(), [nome, preco] = PROVAS[d.prova];
  $('#resumo').innerHTML = `
    <div><span>Prova</span><b>${nome}</b></div>
    <div><span>Atleta</span><b>${esc(d.nome)}</b></div>
    <div><span>E-mail</span><b>${esc(d.email)}</b></div>
    <div><span>Camiseta</span><b>${d.camiseta}</b></div>
    <div class="total"><span>Total</span><b>R$ ${preco},00</b></div>`;
}

function irPara(n) {
  $$('.fstep').forEach(f => f.classList.remove('is-active'));
  $('#result').classList.remove('is-active');
  $('#progress').style.display = '';
  $('#step' + n).classList.add('is-active');
  $$('.steps span').forEach((s, i) => s.classList.toggle('on', i < n));
  $('#stepLabel').textContent = `Etapa ${n} de 3: ${LABELS[n]}`;
  $('#alerta').classList.remove('show');
  if (n === 3) montarResumo();
  rolarAte($('#inscricao'));
}

async function pagar() {
  const d = dados();
  if (!d.termos) { $('#termsErr').classList.add('show'); return; }
  const btn = $('#btnPagar');
  btn.disabled = true; btn.textContent = 'Abrindo o Mercado Pago…';
  $('#alerta').classList.remove('show');
  try {
    const r = await fetch('/api/inscricao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.url) throw new Error(j.erro || 'Não foi possível abrir o pagamento.');
    location.href = j.url;
  } catch (err) {
    $('#alerta').textContent = err.message === 'Failed to fetch' ? 'Sem conexão com o servidor. Confira sua internet e tente de novo.' : `${err.message} Se precisar, fale com a organização pelo e-mail no fim da página.`;
    $('#alerta').classList.add('show');
    btn.disabled = false; btn.textContent = 'Pagar com Mercado Pago';
  }
}

/* o status é sempre confirmado no servidor, nunca só pela URL */
async function mostrarRetorno() {
  const q = new URLSearchParams(location.search);
  const status = q.get('status');
  if (!status) return;
  const mostrar = (tipo, ico, titulo, texto, btn) => {
    $$('.fstep').forEach(f => f.classList.remove('is-active'));
    $('#progress').style.display = 'none';
    $('#result').className = 'result is-active ' + tipo;
    $('#rIco').textContent = ico; $('#rTitle').textContent = titulo; $('#rText').textContent = texto; $('#rBtn').textContent = btn;
    history.replaceState(null, '', location.pathname + '#inscricao');
    setTimeout(() => rolarAte($('#inscricao')), 50);
  };
  if (status === 'teste') {
    return mostrar('', '✓', 'Inscrição de teste feita', 'O site está em modo teste, então nada foi cobrado. Quando o Mercado Pago for ligado, aqui aparece a confirmação real.', 'Fazer outra inscrição');
  }
  const payId = q.get('payment_id') || q.get('collection_id');
  let real = null;
  if (payId) {
    try { const r = await fetch('/api/pagamento/' + encodeURIComponent(payId)); if (r.ok) real = (await r.json()).status; } catch {}
  }
  const st = real || 'desconhecido';
  if (st === 'approved') mostrar('', '✓', 'Inscrição confirmada!', 'Pagamento aprovado. Você vai receber a confirmação por e-mail. Leve documento com foto na retirada do kit.', 'Fazer outra inscrição');
  else if (st === 'pending' || st === 'in_process' || status === 'pendente') mostrar('warn', '…', 'Aguardando pagamento', 'Se pagou com PIX ou boleto, a confirmação chega por e-mail assim que o Mercado Pago aprovar.', 'Fazer outra inscrição');
  else mostrar('bad', '!', 'Pagamento não aprovado', 'O pagamento não foi concluído e nada foi cobrado. Você pode tentar de novo com outro cartão ou PIX.', 'Tentar de novo');
}

export function iniciarInscricao() {
  iniciarValidacao();
  $$('[data-next]').forEach(b => b.addEventListener('click', () => {
    const n = +b.dataset.next;
    if (n === 3) {
      const ok = Object.keys(REGRAS).map(checar).every(Boolean);
      if (!ok) { const f = $('#step2 .has-error input'); f && f.focus(); return; }
    }
    irPara(n);
  }));
  $$('[data-back]').forEach(b => b.addEventListener('click', () => irPara(+b.dataset.back)));
  $('#inTermos').addEventListener('change', e => { if (e.target.checked) $('#termsErr').classList.remove('show'); });
  $('#btnPagar').addEventListener('click', pagar);
  $('#rBtn').addEventListener('click', e => { e.preventDefault(); irPara(1); });
  mostrarRetorno();
}
