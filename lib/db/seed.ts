import { config } from 'dotenv';
import { resolve } from 'path';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

// Load environment variables FIRST
config({ path: resolve(process.cwd(), '.env.local') });

// Then create db connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const { accounts, categories, challenges, competitionConfig } = schema;

const seedAdminUsername = process.env.ADMIN_SEED_USERNAME || 'ISL';
const configuredSeedPassword = process.env.ADMIN_SEED_PASSWORD;

if (!configuredSeedPassword || configuredSeedPassword.length < 8) {
  throw new Error('ADMIN_SEED_PASSWORD must be set and contain at least 8 characters');
}
const seedAdminPassword: string = configuredSeedPassword;

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Create default admin account
    console.log('👤 Creating admin account...');
    const adminPasswordHash = await bcrypt.hash(seedAdminPassword, 12);
    
    // First, try to update existing admin
    const existingAdmin = await db.select().from(accounts).where(eq(accounts.accountType, 'admin')).limit(1);
    
    if (existingAdmin.length > 0) {
      // Update existing admin
      await db
        .update(accounts)
        .set({
          username: seedAdminUsername,
          passwordHash: adminPasswordHash,
        })
        .where(eq(accounts.accountType, 'admin'));
      console.log('   Updated existing admin account');
    } else {
      // Create new admin
      await db.insert(accounts).values({
        username: seedAdminUsername,
        passwordHash: adminPasswordHash,
        accountType: 'admin',
        teamName: null,
      });
      console.log('   Created new admin account');
    }

    // Insert categories
    console.log('📂 Creating categories...');
    const categoryIds: Record<string, number> = {};
    
    const insertedCategories = await db.insert(categories).values([
      { name: 'Web Exploitation', displayOrder: 1 },
      { name: 'Cryptography', displayOrder: 2 },
      { name: 'Forensics', displayOrder: 3 },
      { name: 'Reverse Engineering', displayOrder: 4 },
      { name: 'Pwn', displayOrder: 5 },
      { name: 'OSINT', displayOrder: 6 },
      { name: 'Miscellaneous', displayOrder: 7 },
    ]).onConflictDoNothing().returning();

    insertedCategories.forEach((cat) => {
      categoryIds[cat.name] = cat.id;
    });

    // If categories already existed, fetch them
    if (Object.keys(categoryIds).length === 0) {
      const existingCategories = await db.select().from(categories);
      existingCategories.forEach((cat) => {
        categoryIds[cat.name] = cat.id;
      });
    }

    // Insert sample challenges
    console.log('🎯 Creating sample challenges...');
    await db.insert(challenges).values([
      {
        title: 'Welcome to NEXUS CYPHER',
        description: 'Find the flag hidden in this description. **Flag format**: `NEXUS{...}`\n\nHint: Read the welcome message carefully and look for an unusual token.',
        categoryId: categoryIds['Miscellaneous'],
        points: 10,
        flag: 'NEXUS{w3lc0m3_t0_th3_cyph3r}',
        maxAttempts: null,
        isVisible: true,
        author: 'NEXUS Team',
        displayOrder: 1,
      },
      {
        title: 'Base64 Basics',
        description: 'Decode this Base64 string: `TkVYVVN7YmFzZTY0X2lzX2Vhc3l9`',
        categoryId: categoryIds['Cryptography'],
        points: 25,
        flag: 'NEXUS{base64_is_easy}',
        maxAttempts: 10,
        isVisible: true,
        author: 'NEXUS Team',
        displayOrder: 2,
      },
      {
        title: 'Caesar Cipher',
        description: 'Decrypt this Caesar cipher (shift 13): `ARKHF{pnrfne_vf_gbb_rnfl}`',
        categoryId: categoryIds['Cryptography'],
        points: 50,
        flag: 'NEXUS{caesar_is_too_easy}',
        maxAttempts: 10,
        isVisible: true,
        author: 'NEXUS Team',
        displayOrder: 3,
      },
      {
        title: 'Hidden GET Parameter',
        description: 'Visit the challenge endpoint and find the hidden flag in the URL parameters.\n\n**Challenge URL**: Coming soon...',
        categoryId: categoryIds['Web Exploitation'],
        points: 100,
        flag: 'NEXUS{g3t_p4r4m3t3rs_4r3_fun}',
        maxAttempts: 5,
        isVisible: true,
        author: 'NEXUS Team',
        displayOrder: 4,
      },
    ]).onConflictDoNothing();

    // Insert competition config
    console.log('⚙️  Setting up competition config...');
    await db.insert(competitionConfig).values([
      { key: 'competition_name', value: 'NEXUS CYPHER CTF' },
      { key: 'competition_start', value: new Date('2026-11-15T00:00:00Z').toISOString() },
      { key: 'competition_end', value: new Date('2026-11-17T23:59:59Z').toISOString() },
      { key: 'registration_enabled', value: 'false' },
      { key: 'max_flag_attempts', value: '10' },
    ]).onConflictDoNothing();

    console.log('✅ Database seeded successfully!');
    console.log('');
    console.log('🔐 Admin credentials:');
    console.log(`   Username: ${seedAdminUsername}`);
    console.log('   Password: supplied through ADMIN_SEED_PASSWORD (not printed)');
    console.log('');
    console.log('📊 Seeded data:');
    console.log('   - 1 admin account');
    console.log('   - 7 challenge categories');
    console.log('   - 4 sample challenges');
    console.log('   - 5 competition config entries');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch(() => process.exit(1));
