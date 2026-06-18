# Reservation Dashboard

Painel de reservas em tempo real para restaurantes, que consome dados
diretamente de uma planilha do Google Sheets publicada como CSV.

Construído em **Vanilla JavaScript (ES Modules)**, sem frameworks e sem etapa
de build — basta abrir em um servidor estático.

## Funcionalidades

- 📊 Resumo do dia: total de reservas, adultos, crianças e pessoas.
- 🔎 Busca por nome ou número da mesa.
- 🗂️ Filtro por área (interna / externa).
- ↕️ Ordenação por horário, mesa, nome ou área (preferência salva no navegador).
- 🔄 Atualização automática a cada 15 segundos, com indicador de status.
- 📅 Seleção automática do dia ativo (sábado/domingo) com base na data/hora atual.
- 📱 Layout responsivo, com tabela adaptada para telas pequenas.

## Stack

- HTML5 semântico
- CSS3 (variáveis, grid, flexbox, media queries)
- JavaScript (ES Modules) — sem dependências externas
- Google Sheets como fonte de dados (exportado em CSV)

## Estrutura do projeto

```
├── index.html
├── assets/
│   └── logo.png
├── css/
│   └── styles.css
└── js/
    ├── config.js        # constantes da aplicação
    ├── utils.js          # funções utilitárias (data, escape HTML, URL do sheet)
    ├── csvParser.js       # parsing do CSV em objetos de reserva
    ├── dataService.js      # busca e atualização dos dados
    ├── reservations.js     # regras de filtro, ordenação e dia ativo
    ├── render.js            # atualização do DOM
    └── main.js               # estado da aplicação e eventos
```

## Como executar

Como o projeto usa ES Modules, é necessário servir os arquivos via HTTP (não
funciona abrindo o `index.html` direto pelo `file://`).

```bash
# Python
python3 -m http.server 8080

# ou Node
npx serve .
```

Depois acesse `http://localhost:8080`.

## Conectando sua própria planilha

1. No Google Sheets, vá em **Arquivo → Compartilhar → Publicar na web**.
2. Selecione a aba desejada e o formato **CSV**.
3. Clique em **Publicar** e copie o link gerado.
4. Cole o link no campo exibido no topo do painel e clique em **Carregar**.

A planilha deve seguir o formato esperado pelas colunas:
`Mesa | Nome | Adultos | Crianças | Horário | Área | Observação`, organizadas
em blocos com um título de seção (`Sábado` / `Domingo`).

## Sobre o projeto

Este projeto foi originalmente desenvolvido para a Fazenda Tucunduva e
posteriormente refatorado como peça de portfólio, com foco em organização de
código, separação de responsabilidades, acessibilidade e boas práticas de
front-end sem frameworks.

## Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE) para mais detalhes.
