/* máscaras e regras dos campos do formulário */
import { $ } from './utils.js';

export function cpfValido(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let s = 0; for (let i = 0; i < 9; i++) s += +cpf[i] * (10 - i);
  let r = (s * 10) % 11; if (r === 10) r = 0;
  if (r !== +cpf[9]) return false;
  s = 0; for (let i = 0; i < 10; i++) s += +cpf[i] * (11 - i);
  r = (s * 10) % 11; if (r === 10) r = 0;
  return r === +cpf[10];
}

export const REGRAS = {
  'f-nome':  () => $('#inNome').value.trim().split(/\s+/).length >= 2,
  'f-email': () => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test($('#inEmail').value.trim()),
  'f-tel':   () => $('#inTel').value.replace(/\D/g, '').length >= 10,
  'f-cpf':   () => cpfValido($('#inCpf').value),
  'f-nasc':  () => { const v = $('#inNasc').value; return !!v && (Date.now() - new Date(v)) / 31557600000 >= 16; }
};

export const checar = id => { const ok = REGRAS[id](); $('#' + id).classList.toggle('has-error', !ok); return ok; };

export function iniciarValidacao() {
  $('#inCpf').addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    e.target.value = v;
  });
  $('#inTel').addEventListener('input', e => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 11);
    let v = d;
    if (d.length > 2) v = `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length > 6) v = `(${d.slice(0, 2)}) ${d.slice(2, d.length === 11 ? 7 : 6)}-${d.slice(d.length === 11 ? 7 : 6)}`;
    e.target.value = v;
  });
  Object.keys(REGRAS).forEach(id => {
    const inp = $('#' + id + ' input');
    inp.addEventListener('blur', () => { if (inp.value) checar(id); });
    inp.addEventListener('input', () => { if ($('#' + id).classList.contains('has-error')) checar(id); });
  });
}
