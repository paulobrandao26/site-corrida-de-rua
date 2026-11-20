/**
 * EIXO RUN — ponto de entrada do servidor
 * ------------------------------------------------------------------
 * Pastas:
 *  public/   site (HTML, css/, js/)
 *  src/      servidor: config, rotas, serviços, validação, middlewares
 *  data/     inscrições e ranking real (fora do Git, nunca é servido)
 *
 * Segurança:
 *  - O preço é definido no servidor (src/config.js); o navegador só manda a prova escolhida.
 *  - O Access Token fica no .env (fora do código e do Git).
 *  - O pagamento acontece na página do Mercado Pago: o cartão nunca passa por este site.
 *  - A confirmação vem do próprio Mercado Pago (webhook + consulta), não do navegador.
 *
 * Como rodar:
 *  1) npm install
 *  2) copie .env.example para .env e preencha MP_ACCESS_TOKEN
 *     (sem token o site roda em MODO TESTE, sem cobrar nada)
 *  3) npm start  ->  http://localhost:3001
 */
const app = require('./src/app');
const { PORT, BASE_URL, DEMO, WEBHOOK_SECRET } = require('./src/config');

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Eixo Run em ${BASE_URL}`);
    console.log(DEMO ? 'MODO TESTE: sem MP_ACCESS_TOKEN, nada é cobrado.' : 'Mercado Pago ativo.');
    if (!DEMO && !WEBHOOK_SECRET) console.warn('Atenção: defina MP_WEBHOOK_SECRET para validar os avisos do Mercado Pago.');
  });
}
