import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh auth tokens by validating JWT claims
  // getClaims() validates the JWT signature (unlike getSession() which trusts the token)
  const { data } = await supabase.auth.getClaims()

  // Protect /admin routes
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin')) {
    // Redirect unauthenticated users to home (auth is via modal, no /login page)
    if (!data?.claims) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // Reject authenticated non-admin users -- redirect to /
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', data.claims.sub)
      .single()

    if (!profile?.is_admin) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon)
     * - image files (svg, png, jpg, jpeg, gif, webp)
     *
     * IMPORTANT: /api/auth routes MUST be included so cookies
     * get set during auth callback
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
