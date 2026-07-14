// Constantes da aplicação.

// ─── Credenciais do proxy ─────────────────────────────────────────────────────
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
export const PROXY_URL   = env.VITE_PROXY_URL   || '';
export const PROXY_TOKEN = env.VITE_PROXY_TOKEN  || '';

// ─── API do PowerChef ────────────────────────────────────────────────────────
// URL da API Node.js que lê as mesas abertas no PowerChef em tempo real.
// Em desenvolvimento: mesma URL do Cloudflare Tunnel
// Em produção: trocar pela URL fixa quando tiver domínio próprio
export const POWERCHEF_API_URL = env.VITE_POWERCHEF_API_URL || '';

export const REFRESH_INTERVAL_MS     = 16000;
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
