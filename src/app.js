/* monta o servidor: segurança, rotas da API e arquivos do site */
const path = require('path');
const express = require('express');
const seguranca = require('./middlewares/seguranca');
const erros = require('./middlewares/erros');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // pega o IP real atrás do Vercel (usado no limite de tentativas)
app.use(express.json({ limit: '10kb' }));
app.use(seguranca);

app.use('/api', require('./rotas/publico'));
app.use('/api', require('./rotas/inscricao'));
app.use('/api', require('./rotas/webhook'));

/* site: só a pasta public (nada de .env, src/ ou data/) */
app.use(express.static(path.join(__dirname, '..', 'public'), { dotfiles: 'deny' }));

app.use(erros);

module.exports = app;
