import { sql } from '@/lib/db/neon-client';

async function addAdditionalFlagsColumn() {
  try {
    console.log('Adding additional_flags column to challenges table...');
    
    await sql`
      ALTER TABLE challenges 
      ADD COLUMN IF NOT EXISTS additional_flags TEXT;
    `;
    
    console.log('✅ Successfully added additional_flags column!');
    console.log('This column will store alternative flags as JSON array.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

addAdditionalFlagsColumn()
  .then(() => {
    console.log('Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
