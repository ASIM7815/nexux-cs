import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL!);

async function executeWithRetry<T>(fn: () => Promise<T>, retries = 5): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      console.log(`  Attempt ${i + 1}/${retries} failed: ${error.message}`);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 200));
    }
  }
  throw new Error('All retries failed');
}

async function deleteDemoChallenges() {
  console.log('🗑️  Deleting demo challenges...\n');
  
  try {
    // Get list of all challenges
    console.log('Connecting to database...');
    const challenges = await executeWithRetry(() => 
      sql`SELECT id, title, points FROM challenges`
    );
    
    if (challenges.length === 0) {
      console.log('✅ No challenges found. Database is clean.');
      return;
    }
    
    console.log(`\n✅ Found ${challenges.length} challenge(s):\n`);
    challenges.forEach((c: any) => {
      console.log(`  - ${c.title} (${c.points} pts)`);
    });
    console.log('');
    
    // Delete all challenges (this will cascade delete hints, submissions, solves)
    console.log('Deleting challenges and related data...');
    await executeWithRetry(() => sql`DELETE FROM challenges`);
    
    console.log('✅ All demo challenges deleted successfully!\n');
    console.log('💡 You can now add your own challenges from the admin panel:');
    console.log('   http://localhost:3000/admin/challenges\n');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\nThis is a Neon connection issue. Try running the script again.');
  }
}

deleteDemoChallenges();
