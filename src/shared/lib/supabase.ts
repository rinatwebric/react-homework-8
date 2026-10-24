/**
 * Доступ к Supabase из клиента.
 *
 * Клиент вызывает Edge Functions обычным fetch (`submit-report`); SDK базы
 * не нужен. В клиент попадают лишь VITE_SUPABASE_URL и публичный ключ;
 * service_role и ключи моделей — только в секретах функций.
 */
import { z } from 'zod'

const supabaseConfigSchema = z.object({
  url: z.url(),
  anonKey: z.string().min(20),
})

export type SupabaseConfig = z.infer<typeof supabaseConfigSchema>

/** Чистая функция: null, если переменные не заданы или битые (тогда форма честно скажет об этом). */
export function readSupabaseConfig(env: {
  url?: string | undefined
  anonKey?: string | undefined
}): SupabaseConfig | null {
  const parsed = supabaseConfigSchema.safeParse({
    url: env.url?.trim(),
    anonKey: env.anonKey?.trim(),
  })
  return parsed.success ? parsed.data : null
}

export const supabaseConfig = readSupabaseConfig({
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
})

export function edgeFunctionUrl(name: string): string {
  if (!supabaseConfig) {
    throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY не заданы')
  }
  return `${supabaseConfig.url.replace(/\/+$/, '')}/functions/v1/${name}`
}