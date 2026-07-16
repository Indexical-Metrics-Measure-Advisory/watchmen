const pad2 = (value: number): string => (value < 10 ? `0${value}` : String(value));

export const formatDateTime = (input?: string | Date | null): string => {
  if (!input) {
    return '-';
  }
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hour = pad2(date.getHours());
  const minute = pad2(date.getMinutes());
  const second = pad2(date.getSeconds());
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

export const formatDate = (input?: string | Date | null, locale = 'en'): string => {
  if (!input) {
    return '-';
  }
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return new Intl.DateTimeFormat(locale).format(date);
};

export const formatNumber = (value: number, locale = 'en'): string =>
  new Intl.NumberFormat(locale).format(value);

export const formatPercent = (value: number, locale = 'en'): string =>
  new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(value);

export const formatRelativeTime = (input?: string | Date | null, locale = 'en', baseMs = Date.now()): string => {
  if (!input) {
    return '-';
  }
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  const diffSeconds = Math.round((date.getTime() - baseMs) / 1000);
  const absSeconds = Math.abs(diffSeconds);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });

  if (absSeconds >= 86400) {
    return formatter.format(Math.round(diffSeconds / 86400), 'day');
  }
  if (absSeconds >= 3600) {
    return formatter.format(Math.round(diffSeconds / 3600), 'hour');
  }
  if (absSeconds >= 60) {
    return formatter.format(Math.round(diffSeconds / 60), 'minute');
  }
  return formatter.format(diffSeconds, 'second');
};

const durationUnits = {
  en: { day: 'd', hour: 'h', minute: 'm', second: 's' },
  'zh-CN': { day: '天', hour: '小时', minute: '分', second: '秒' },
} as const;

export const formatDuration = (milliseconds: number, locale = 'en'): string => {
  const units = durationUnits[locale as keyof typeof durationUnits] ?? durationUnits.en;
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}${units.day} ${hours}${units.hour}`;
  }
  if (hours > 0) {
    return `${hours}${units.hour} ${minutes}${units.minute}`;
  }
  if (minutes > 0) {
    return `${minutes}${units.minute} ${seconds}${units.second}`;
  }
  return `${seconds}${units.second}`;
};
