# Eixo Run · Inscrição para corrida de rua

Site de uma corrida noturna (5K, 10K e 21K) com inscrição online, pagamento pelo Mercado Pago, lista de inscritos e ranking.

**Ver online:** https://site-corrida-de-rua.vercel.app

## O que o site faz

- **Inscrição em 3 passos:** escolha da distância, dados do atleta (nome, e-mail, celular, CPF, nascimento, camiseta) e pagamento.
- **Pagamento pelo Mercado Pago:** cartão, PIX ou boleto. O cartão nunca passa por este site.
- **Confirmação automática:** o Mercado Pago avisa o servidor (webhook) e o atleta entra na lista de inscritos.
- **Ranking por distância:** os 10 primeiros de 5K, 10K e 21K.
- **Dúvidas frequentes** e layout pensado primeiro para o celular.

## Tecnologias

- **Front-end:** HTML, CSS e JavaScript puros, sem framework
- **Back-end:** Node.js com Express 5
- **Pagamento:** SDK oficial do Mercado Pago
- **Deploy:** Vercel

## Estrutura de pastas

```
site-corrida/
├── server.js                 # ponto de entrada: sobe o servidor
├── vercel.json               # cabeçalhos de segurança no deploy
├── .env.example              # modelo das variáveis de ambiente
│
├── public/                   # tudo que o navegador recebe
│   ├── index.html
│   ├── css/
│   │   ├── base.css          # cores, fontes e reset
│   │   ├── layout.css        # grade e containers
│   │   ├── componentes.css   # botões, cards, formulários
│   │   ├── responsivo.css    # ajustes para celular e tablet
│   │   └── secoes/           # um arquivo por seção da página
│   └── js/
│       ├── main.js           # inicia cada seção
│       ├── utils.js
│       ├── validacao.js      # validação dos campos no navegador
│       └── secoes/           # um arquivo por seção da página
│
└── src/                      # servidor (nunca é enviado ao navegador)
    ├── app.js                # monta o Express: segurança, rotas e site
    ├── config.js             # variáveis de ambiente e preços oficiais
    ├── rotas/                # endpoints da API
    │   ├── publico.js        #   GET  /api/config, /api/inscritos, /api/ranking
    │   ├── inscricao.js      #   POST /api/inscricao, GET /api/pagamento/:id
    │   └── webhook.js        #   POST /api/webhook-mercadopago
    ├── servicos/
    │   └── mercadopago.js    # conversa com a API do Mercado Pago
    ├── validacao/
    │   └── inscricao.js      # valida os dados no servidor
    ├── repositorios/
    │   └── inscricoes.js     # lê e grava as inscrições
    ├── middlewares/
    │   ├── seguranca.js      # cabeçalhos de segurança
    │   ├── limite.js         # limite de tentativas por IP
    │   └── erros.js          # resposta padrão de erro
    └── dados/
        └── ranking-exemplo.json
```

Cada pasta tem uma função só: **rotas** recebem o pedido, **validação** confere os dados, **serviços** falam com o Mercado Pago e **repositórios** guardam as inscrições. Assim dá para trocar uma parte (por exemplo, o arquivo JSON por um banco de dados) sem mexer nas outras.

## Segurança

- O **preço é definido no servidor** (`src/config.js`). O navegador só envia a distância escolhida.
- Os dados são **validados duas vezes**: no navegador e no servidor.
- O **token do Mercado Pago** fica no `.env`, fora do código e do Git.
- A confirmação do pagamento vem do **Mercado Pago**, não do navegador, e a assinatura do webhook é conferida.
- A lista pública de inscritos mostra **só o nome** de quem já pagou.
- Há limite de tentativas por IP e cabeçalhos de segurança (CSP, HSTS, X-Frame-Options).

## Como rodar no seu computador

```bash
npm install
cp .env.example .env    # preencha MP_ACCESS_TOKEN (use a credencial de TESTE)
npm start               # abre em http://localhost:3001
```

Sem `MP_ACCESS_TOKEN`, o site roda em **modo teste** e não cobra nada.

## Limitação conhecida

Na Vercel, as inscrições ficam numa pasta temporária, que é apagada de tempos em tempos. Para uma corrida de verdade, o próximo passo é trocar `src/repositorios/inscricoes.js` por um banco de dados (por exemplo, Supabase ou Postgres).

---

Feito por **Paulo Brandão** · [Portfólio](https://paulobrandao26.github.io/portifolio-FrontEnd/) · [GitHub](https://github.com/paulobrandao26)
