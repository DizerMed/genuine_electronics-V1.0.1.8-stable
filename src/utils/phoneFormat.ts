export function formatTzPhone(phone: string): string {
  if (!phone) return phone;
  // Remove all non-digits except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If it starts with 0 and is 10 digits, convert to +255
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '+255' + cleaned.substring(1);
  } else if (cleaned.startsWith('255') && cleaned.length === 12) {
    cleaned = '+' + cleaned;
  }
  
  // Format as +255 XXX XXX XXX if it matches
  if (cleaned.startsWith('+255') && cleaned.length === 13) {
    return `${cleaned.slice(0,4)} ${cleaned.slice(4,7)} ${cleaned.slice(7,10)} ${cleaned.slice(10)}`;
  }
  
  return cleaned;
}
