/* atalhos e funções usadas em várias partes do site */
export const $ = s => document.querySelector(s);
export const $$ = s => document.querySelectorAll(s);
export const reduzirMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const rolarAte = el => el.scrollIntoView({ behavior: reduzirMovimento ? 'auto' : 'smooth', block: 'start' });
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const semAcento = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
