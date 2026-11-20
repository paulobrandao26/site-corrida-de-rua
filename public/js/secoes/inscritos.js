/* lista pública de inscritos (só nomes) */
import { $, esc, semAcento } from '../utils.js';

const LIMITE = 20;

export async function iniciarInscritos() {
  let nomes = [], todos = false;
  try { const r = await fetch('/api/inscritos'); nomes = (await r.json()).nomes || []; } catch {}
  $('#inscCount').textContent = nomes.length
    ? `${nomes.length} ${nomes.length === 1 ? 'pessoa inscrita' : 'pessoas inscritas'} até agora.`
    : 'Ainda não há inscrições confirmadas. Seja o primeiro!';
  $('#buscaBox').hidden = nomes.length < 10;

  function render() {
    const q = semAcento($('#busca').value.trim());
    let lista = q ? nomes.filter(n => semAcento(n).includes(q)) : nomes;
    const cortar = !q && !todos && lista.length > LIMITE;
    $('#verMais').hidden = !cortar;
    $('#verMais').textContent = `Ver todos (${lista.length})`;
    if (cortar) lista = lista.slice(0, LIMITE);
    $('#listaNomes').innerHTML = lista.map(n => `<li>${esc(n)}</li>`).join('');
    $('#nomesVazio').hidden = !(q && !lista.length);
    $('#nomesVazio').textContent = 'Nenhum nome encontrado. Confira a grafia.';
  }
  $('#busca').addEventListener('input', render);
  $('#verMais').addEventListener('click', () => { todos = true; render(); });
  render();
}
