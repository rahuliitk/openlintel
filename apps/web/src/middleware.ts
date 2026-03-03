import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

/**
 * Middleware uses the edge-safe auth config (no Drizzle/postgres imports).
 * The `authorized` callback in auth.config.ts handles route protection.
 */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/project/:path*',
    '/auth/:path*',
    '/analytics/:path*',
    '/portfolios/:path*',
    '/marketplace/:path*',
    '/developer/:path*',
    '/notifications/:path*',
    '/admin/:path*',
  ],
};
