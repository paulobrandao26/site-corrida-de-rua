/* "como funciona": a tela fica parada e troca a etapa conforme a rolagem */
import { $, $$, reduzirMovimento } from '../utils.js';

export function iniciarComoFunciona() {
  if (reduzirMovimento) return;
  const sec = $('#como-funciona'), steps = $$('.pin-step'), bars = $$('.pin-bar span'), img = $('.pin-photo img');
  let atual = 0, pedido = false;
  function atualizar() {
    pedido = false;
    const r = sec.getBoundingClientRect();
    const total = sec.offsetHeight - innerHeight;
    const prog = Math.min(1, Math.max(0, -r.top / total));
    const i = Math.min(steps.length - 1, Math.floor(prog * steps.length));
    img.classList.toggle('zoom', r.top < innerHeight * .5);
    if (i === atual) return;
    atual = i;
    steps.forEach((s, k) => s.classList.toggle('on', k === i));
    bars.forEach((b, k) => b.classList.toggle('on', k <= i));
  }
  addEventListener('scroll', () => { if (!pedido) { pedido = true; requestAnimationFrame(atualizar); } }, { passive: true });
  atualizar();
}
