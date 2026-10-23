import { neon, neonConfig } from '@neondatabase/serverless';

async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await fetch(input, init);
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Database network request failed');
}

// Create connection with retry logic
export function createNeonClient(connectionString: string = process.env.DATABASE_URL!) {
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  neonConfig.fetchFunction = fetchWithRetry;
  return neon(connectionString, {
    fetchOptions: {
      cache: 'no-store',
    },
  });
}

// Helper function to execute queries with retry logic
export async function executeWithRetry<T>(
  queryFn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 200
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Database query failed');
      console.warn(
        `Query attempt ${attempt}/${maxRetries} failed:`,
        error instanceof Error ? error.message : 'unknown error'
      );

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = delayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Query failed after retries');
}

// Default SQL client with retry
export const sql = createNeonClient();
