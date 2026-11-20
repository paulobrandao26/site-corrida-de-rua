/* menu do topo e barra fixa do celular */
import { $ } from '../utils.js';

export function iniciarTopo() {
  addEventListener('scroll', () => $('#nav').classList.toggle('is-scrolled', scrollY > 30), { passive: true });
  new IntersectionObserver(([e]) => $('#mobileCta').classList.toggle('is-hidden', e.isIntersecting), { threshold: .05 }).observe($('#inscricao'));
}
