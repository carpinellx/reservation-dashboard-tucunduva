// Constantes da aplicação.

export const SPREADSHEET_ID = '1Sk1QLUn4ymAIRco2M7yD3ep5oW-G6iowcimP1P4SWJ0';

export const REFRESH_INTERVAL_MS = 16000;
export const ARRIVAL_TOLERANCE_MINUTES = 15;

export const DEFAULT_SORT = 'nome';

// Preços do café da manhã.
// Criança até 5 anos é gratuita — não entra no cálculo.
export const CAFE_PRICING = {
  adulto:        79.90,
  crianca_paga:  35.00, // 6 a 10 anos
};

// Configuração de cada tipo de serviço: nome, ícone e janela de horário.
export const SERVICES = {
  almoco: {
    label: 'Almoço',
    icon: '🍽️',
    start: '12:00',
    end: '17:00',
  },
  cafe: {
    label: 'Café da manhã',
    icon: '☕',
    start: '08:00',
    end: '11:00',
  },
};
