import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { sql, executeWithRetry } from '@/lib/db/neon-client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

async function getAccount(username: string) {
  try {
    return await executeWithRetry(async () => {
      const result = await sql`SELECT * FROM accounts WHERE username = ${username} LIMIT 1`;
      return result[0] || null;
    }, 5); // 5 retries for auth queries
  } catch (error: any) {
    console.error('Failed to fetch account after retries:', error.message);
    return null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
  session: {
    strategy: 'jwt',
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ username: z.string(), password: z.string().min(1) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { username, password } = parsedCredentials.data;
          const account = await getAccount(username);
          
          if (!account) {
            console.log('Account not found:', username);
            return null;
          }

          const passwordsMatch = await bcrypt.compare(password, account.password_hash);

          if (passwordsMatch) {
            return {
              id: account.id.toString(),
              name: account.username,
              email: account.username, // NextAuth requires email
              accountType: account.account_type,
              teamName: account.team_name,
            };
          } else {
            console.log('Password mismatch for:', username);
          }
        }

        console.log('Invalid credentials');
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.accountType = (user as any).accountType;
        token.teamName = (user as any).teamName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).accountType = token.accountType;
        (session.user as any).teamName = token.teamName;
      }
      return session;
    },
  },
});
