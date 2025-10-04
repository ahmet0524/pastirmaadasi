// src/lib/auth.ts
import { supabaseAdmin } from '../lib/supabase';

/**
 * getSession
 * - Opsiyonel: pass a Request object (e.g. from Astro: `await getSession({ request: Astro.request })`)
 * - Eğer Request verilirse cookie içindeki erişim token'ını alır ve Supabase ile user bilgisini çeker.
 * - Eğer Request yoksa ve SUPABASE_SERVICE_ROLE_KEY varsa, service-role "admin" benzeri bir nesne döner.
 *
 * NOT: Prod ortamda gerçek oturum kontrolü için istemci tarafından gelen access_token'ı / cookie'yi
 * doğrulayarak kullanın. Bu temel implementasyonu kendi auth flow'una göre adapte et.
 */
export async function getSession(options?: { request?: Request } ) {
  // 1) Eğer request objesi verildiyse cookie'lerden token almaya çalış
  if (options?.request) {
    try {
      const cookieHeader = options.request.headers.get('cookie') || '';
      // yaygın Supabase client cookie isimleri: "sb:token" veya "sb-access-token"
      const tokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/) || cookieHeader.match(/sb:token=([^;]+)/);
      const accessToken = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;

      if (accessToken) {
        // supabaseAdmin.auth.getUser requires the accessToken
        const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
        if (error) {
          console.warn('Supabase getUser error:', error);
        } else if (data?.user) {
          return { user: data.user };
        }
      }
    } catch (err) {
      console.warn('getSession(request) error:', err);
    }
  }

  // 2) Fallback: eğer service role key varsa, geliştirme / build sırasında admin gibi davran
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      user: {
        id: 'service_role',
        role: 'admin',
        email: process.env.ADMIN_EMAIL || null,
      },
      __isServiceRole: true,
    };
  }

  // 3) Oturum yok
  return null;
}

/**
 * requireSession
 * - Eğer session yoksa throw Astro.redirect(...) ile yönlendirme yapmak isteyen sayfalar için kullanışlıdır.
 * - Bu fonksiyonu sayfanın başında `const session = await requireSession({ request: Astro.request })`
 *   şeklinde kullanabilirsin (Astro sayfasında).
 */
export async function requireSession(options?: { request?: Request }) {
  const session = await getSession(options);
  if (!session) return null;
  return session;
}
