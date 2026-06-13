// Funções utilitárias puras (sem efeitos colaterais no DOM), fáceis de testar isoladamente.

const WEEKDAY_NAMES = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
];

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/**
 * Formata a data atual no padrão "Sábado, 13 de junho".
 */
export function formatDate(date = new Date()) {
  return `${WEEKDAY_NAMES[date.getDay()]}, ${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}`;
}

/**
 * Define qual seção da planilha (sábado/domingo) deve ser exibida,
 * de acordo com o dia/hora atuais.
 *
 * Regras:
 * - Domingo após 18h: já mostra as reservas do próximo sábado.
 * - Domingo antes das 18h: mostra as reservas de domingo.
 * - Sábado após 18h: mostra as reservas de domingo.
 * - Sábado antes das 18h: mostra as reservas de sábado.
 * - Segunda a sexta: sempre mostra as reservas de sábado (próximo fim de semana).
 */
export function getDiaAtivo(date = new Date()) {
  const diaSemana = date.getDay(); // 0 = domingo, 6 = sábado
  const hora = date.getHours();

  if (diaSemana === 0) {
    return hora >= 18 ? 'sabado' : 'domingo';
  }

  if (diaSemana === 6) {
    return hora >= 18 ? 'domingo' : 'sabado';
  }

  return 'sabado';
}

/**
 * Converte uma URL "normal" do Google Sheets (a que aparece na barra de
 * endereço ao editar a planilha) para a URL de exportação em CSV.
 * Retorna `null` se a URL informada não for de uma planilha do Google Sheets.
 */
export function buildCsvUrl(rawUrl) {
  const idMatch = rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!idMatch) return null;

  const gidMatch = rawUrl.match(/gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : '0';

  return `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv&gid=${gid}`;
}

/**
 * Escapa caracteres HTML para evitar injeção (XSS) ao exibir dados
 * vindos da planilha (fonte externa e editável por terceiros).
 */
export function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}
