import { NextResponse, type NextRequest } from 'next/server'

// Middleware simplificado — só deixa passar tudo
// A proteção de rotas é feita dentro de cada página
export async function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
