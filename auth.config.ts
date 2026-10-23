import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/participantauth',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnArena = nextUrl.pathname.startsWith('/arena');
      const isOnAdmin = nextUrl.pathname.startsWith('/admin');
      const isOnAuth = nextUrl.pathname === '/participantauth' || nextUrl.pathname === '/admin';
      
      // Protect arena routes (require team login)
      if (isOnArena && !isOnAuth) {
        if (!isLoggedIn) {
          return false; // Redirect to participantauth
        }
        // Check if user is a team (not admin accessing arena)
        if (auth.user.accountType === 'admin') {
          return Response.redirect(new URL('/admin/dashboard', nextUrl));
        }
      }

      // Protect admin routes (require admin login)
      if (isOnAdmin && nextUrl.pathname !== '/admin') {
        if (!isLoggedIn) {
          return Response.redirect(new URL('/admin', nextUrl));
        }
        // Check if user is admin
        if (auth.user.accountType !== 'admin') {
          return Response.redirect(new URL('/arena/challenges', nextUrl));
        }
      }
      
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.accountType = user.accountType;
        token.teamName = user.teamName;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.accountType = token.accountType as 'admin' | 'team';
      session.user.teamName = typeof token.teamName === 'string' ? token.teamName : null;
      return session;
    },
  },
  providers: [], // Added in auth.ts
} satisfies NextAuthConfig;
