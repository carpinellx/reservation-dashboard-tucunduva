const WEEKDAY_NAMES = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
];

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export function formatDate(date = new Date()) {
  return `${WEEKDAY_NAMES[date.getDay()]}, ${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}`;
}

// Regras de alternância entre as agendas de sábado e domingo.
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

export function buildCsvUrl(rawUrl) {
  const idMatch = rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!idMatch) return null;

  const gidMatch = rawUrl.match(/gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : '0';

  return `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv&gid=${gid}`;
}

// Evita XSS ao renderizar dados vindos da planilha.
export function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}
