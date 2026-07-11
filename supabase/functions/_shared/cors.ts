// Header CORS condivisi: permettono al frontend (browser) di chiamare le
// Edge Function. La chiamata Edge Function → Aruba/FiC avviene lato server,
// quindi lì il CORS non esiste.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Base64 sicuro per stringhe UTF-8 (l'XML può contenere accenti).
export function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin)
}
