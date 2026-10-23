import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    accountType: 'admin' | 'team' | 'participant';
    teamName: string | null;
    sessionId?: string;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      accountType: 'admin' | 'team' | 'participant';
      teamName: string | null;
      sessionId: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    accountType: 'admin' | 'team' | 'participant';
    teamName: string | null;
    sessionId: string;
  }
}
