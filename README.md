# Reservation Dashboard — Fazenda Tucunduva

Painel operacional de reservas em tempo real para restaurantes. Desenvolvido originalmente para a Fazenda Tucunduva e refatorado como peça de portfólio com foco em arquitetura modular, segurança e boas práticas de front-end.

<!-- screenshot -->
> 🖼️ _Adicione aqui um screenshot do painel. Arraste a imagem diretamente nesta área no GitHub._

**[→ Ver demo ao vivo](https://reservation-dashboard-tucunduva.vercel.app)**

![Tests](https://github.com/carpinellx/reservation-dashboard-tucunduva/actions/workflows/test.yml/badge.svg)

---

## Funcionalidades

- 📊 Resumo do dia: total de reservas, adultos, crianças e pessoas
- 🔎 Busca em tempo real por nome ou número de mesa
- 🗂️ Filtro por área (interna / externa)
- ↕️ Ordenação por horário, mesa, nome ou área
- 🔄 Atualização automática a cada 16 segundos com indicador de status
- 📅 Seleção automática do evento ativo com base na data e hora atual
- 🌙 Modo escuro, com preferência salva no navegador
- 📱 Layout responsivo para uso em celular pelo garçom durante o serviço
- ☕ Layout alternativo para eventos de café da manhã (com cálculo de valor por pessoa)

## Stack

- **Vanilla JavaScript** (ES Modules) — sem frameworks
- **Vite** — bundler para injeção de variáveis de ambiente e build de produção
- **Google Apps Script** — proxy seguro entre o painel e o Google Sheets
- **Vercel** — hospedagem com deploy automático a cada push
- **Node.js test runner** — testes unitários sem dependências externas

## Arquitetura

```
Navegador → Vercel (estático)
               ↓ fetch
         Apps Script (proxy privado)
               ↓ lê
         Google Sheets (planilha privada)
```

A planilha **não é pública** — o acesso passa obrigatoriamente pelo proxy, que valida um token e aplica rate limiting por IP. O `SPREADSHEET_ID` nunca aparece no código do frontend.

## Estrutura do projeto

```
├── index.html
├── vite.config.js
├── .env.example              # formato das variáveis de ambiente
├── assets/
├── css/
│   └── styles.css
├── js/
│   ├── config.js             # constantes e variáveis de ambiente
│   ├── utils.js              # funções utilitárias (data, escape HTML)
│   ├── sheets.js             # busca dados via proxy
│   ├── csvParser.js          # parsing do CSV em objetos de reserva
│   ├── events.js             # lógica de seleção de evento ativo
│   ├── reservations.js       # filtro, ordenação, tolerância e precificação
│   ├── render.js             # atualização do DOM
│   ├── theme.js              # modo escuro
│   └── main.js               # estado e orquestração
├── proxy/
│   └── proxy.gs              # Google Apps Script (roda na conta Google, não no servidor)
└── test/
    ├── events.test.js
    ├── csvParser.test.js
    └── reservations.test.js
```

## Como executar localmente

```bash
# 1. Instalar dependências
npm install

# 2. Criar o arquivo de variáveis de ambiente
cp .env.example .env
# Preencha VITE_PROXY_URL e VITE_PROXY_TOKEN no .env

# 3. Iniciar o servidor de desenvolvimento
npm run dev
```

## Testes

```bash
npm test
```

Roda 33 testes unitários com o Node.js test runner nativo (sem dependências externas), cobrindo a lógica de seleção de evento ativo, parsing de CSV e filtros de reserva — incluindo o caso de eventos que atravessam a meia-noite.

## Deploy

O projeto usa Vercel com deploy automático. A cada push na branch `main`:

1. A Vercel roda `vite build`
2. Injeta `VITE_PROXY_URL` e `VITE_PROXY_TOKEN` das variáveis de ambiente configuradas no dashboard
3. Publica o resultado em produção

As credenciais nunca aparecem no repositório.

## Segurança e limitações conhecidas

O proxy (Google Apps Script) adiciona:
- Validação de token em cada requisição
- Rate limiting por IP (30 req/min)

O token é injetado no bundle JavaScript pelo Vite no momento do build — fica visível no DevTools do navegador, o que é inevitável em qualquer aplicação 100% frontend. O ganho em relação ao acesso direto ao Google Sheets é que a planilha permanece privada e o `SPREADSHEET_ID` não é exposto.

## Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE) para mais detalhes.