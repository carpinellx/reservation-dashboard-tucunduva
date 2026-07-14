// Integração com a API do PowerChef.

import { POWERCHEF_API_URL } from './config.js';

// Lista fixa de mesas do salão (sem 13 e 14)
export const MESAS_SALAO = [
   1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12,
  15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
  27, 28, 29, 30,
];

let cachedMesas = [];

/**
 * Busca as mesas abertas no PowerChef.
 * Retorna array vazio silenciosamente se a URL não estiver configurada
 * ou se a API estiver indisponível.
 */
export async function fetchMesasOcupadas() {
  if (!POWERCHEF_API_URL) return [];

  try {
    const response = await fetch(`${POWERCHEF_API_URL}/api/mesas`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    cachedMesas = await response.json();
    return cachedMesas;
  } catch (err) {
    console.warn('PowerChef API indisponível:', err.message);
    return cachedMesas;
  }
}

/**
 * Calcula o status de uma reserva cruzando com as mesas abertas no PowerChef.
 * Usado na visão padrão (só reservas).
 */
export function calcularStatusMesa(numMesa, mesasOcupadas) {
  if (!mesasOcupadas || mesasOcupadas.length === 0) return null;

  const mesaAberta = mesasOcupadas.find((m) => m.mesa === Number(numMesa));

  if (mesaAberta) {
    return { label: '🔴 Chegou', classe: 'status-chegou', extra: mesaAberta.horaEntrada ? `desde ${mesaAberta.horaEntrada}` : '' };
  }

  return { label: '🟡 Reservada', classe: 'status-reservada', extra: '' };
}

/**
 * Monta a visão completa do salão (todas as 28 mesas).
 * Usado quando o garçom clica em "Todas as mesas".
 *
 * Status:
 *   🔴 Chegou    → tem reserva E está aberta no PowerChef
 *   🔴 Ocupada   → aberta no PowerChef, sem reserva
 *   🟡 Reservada → tem reserva, ainda não chegou
 *   🟢 Livre     → sem reserva e sem cliente
 */
export function montarVisaoSalao(mesasOcupadas, reservas) {
  return MESAS_SALAO.map((numMesa) => {
    const mesaAberta = mesasOcupadas.find((m) => m.mesa === numMesa);
    const reserva    = reservas.find((r) => Number(r.mesa) === numMesa);

    let label, classe;

    if (mesaAberta && reserva) {
      label = '🔴 Chegou';    classe = 'status-chegou';
    } else if (mesaAberta) {
      label = '🔴 Ocupada';   classe = 'status-ocupada';
    } else if (reserva) {
      label = '🟡 Reservada'; classe = 'status-reservada';
    } else {
      label = '🟢 Livre';     classe = 'status-livre';
    }

    return { mesa: numMesa, label, classe, reserva: reserva || null, mesaAberta: mesaAberta || null };
  });
}