/**
 * CORS для Edge Functions.
 * Функцию вызывает PWA с другого домена (Vercel). Cookie и сессии не используем,
 * поэтому разрешаем любой Origin; авторизация — заголовком (anon-ключ).
 */
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

export function preflightResponse(): Response {
  return new Response(null, { status: 204, headers: corsHeaders })
}