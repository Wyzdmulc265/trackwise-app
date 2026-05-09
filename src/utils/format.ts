export const formatCurrency = (val: number | undefined | null): string => {
  if (val === undefined || val === null) return 'MWK 0.00';
  const num = Number(val);
  if (!Number.isFinite(num)) return 'MWK 0.00';
  return new Intl.NumberFormat('en-MW', { style: 'currency', currency: 'MWK', minimumFractionDigits: 2 }).format(num);
};

export const formatNumber = (val: number | undefined | null): string => {
  if (val === undefined || val === null) return '0';
  const num = Number(val);
  if (!Number.isFinite(num)) return '0';
  return new Intl.NumberFormat('en-MW').format(num);
};