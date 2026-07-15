
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
export const PROXY_URL   = env.VITE_PROXY_URL   || '';
export const PROXY_TOKEN = env.VITE_PROXY_TOKEN  || '';

// URL da API Node.js que lê as mesas abertas no PowerChef em tempo real.
// Em desenvolvimento: mesma URL do Cloudflare Tunnel
// Em produção: trocar pela URL fixa quando tiver domínio próprio
export const POWERCHEF_API_URL = env.VITE_POWERCHEF_API_URL || '';

export const REFRESH_INTERVAL_MS     = 16000;
export const ARRIVAL_TOLERANCE_MINUTES = 15;

export const DEFAULT_SORT = 'nome';

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
