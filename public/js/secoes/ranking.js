/* ranking: 1º ao 10º lugar por distância */
import { $, $$, esc } from '../utils.js';

export async function iniciarRanking() {
  let dados = { provas: {} };
  try { const r = await fetch('/api/ranking'); dados = await r.json(); } catch {}
  $('#avisoExemplo').hidden = !dados.exemplo;

  function mostrar(p) {
    $$('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === p));
    const lista = (dados.provas[p] || []).slice(0, 10);
    $('#rankVazio').hidden = lista.length > 0;
    $('#rankLista').hidden = !lista.length;
    $('#rankLista').innerHTML = lista.map((c, i) =>
      `<li><span class="pos" aria-label="${i + 1}º lugar">${i < 3 ? i + 1 : (i + 1) + 'º'}</span><span class="nm">${esc(c.nome)}</span><span class="tm">${esc(c.tempo || '')}</span></li>`).join('');
  }
  $$('.tabs button').forEach(b => b.addEventListener('click', () => mostrar(b.dataset.tab)));
  mostrar('10');
}
