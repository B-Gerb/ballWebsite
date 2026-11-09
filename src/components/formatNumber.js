/** Short display form: 12.34K, 5.00M, ... (two decimals below 10K). */
export const formatNumber = (value) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e15) return value.toExponential(2);
  if (abs >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e4) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(2);
};
