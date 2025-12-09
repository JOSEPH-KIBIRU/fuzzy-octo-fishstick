// utils/currencyFormatter.js
export const formatCurrency = (amount, currency = 'KSH') => {
  if (amount === null || amount === undefined) return `${currency} 0.00`;
  
  const num = parseFloat(amount);
  if (isNaN(num)) return `${currency} 0.00`;
  
  // Format with commas every 3 digits and 2 decimal places
  const formatted = num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  return `${currency} ${formatted}`;
};

// For display without currency symbol (just the formatted number)
export const formatNumberWithCommas = (number) => {
  if (number === null || number === undefined) return '0.00';
  
  const num = parseFloat(number);
  if (isNaN(num)) return '0.00';
  
  return num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
};

// For input formatting (remove commas when editing)
export const parseCurrencyInput = (value) => {
  if (!value) return '';
  return value.replace(/,/g, '');
};