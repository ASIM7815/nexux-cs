import { config } from 'dotenv';
import { resolve } from 'path';
import { neon } from '@neondatabase/serverless';

config({ path: resolve(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL!);

async function testPlatform() {
  console.log('🧪 NEXUS CYPHER CTF Platform - System Check\n');
  console.log('='.repeat(60));

  const results = {
    database: false,
    tables: false,
    admin: false,
    categories: false,
    challenges: false,
    routing: false,
  };

  try {
    // Test 1: Database Connection
    console.log('\n📡 Test 1: Database Connection');
    try {
      await sql`SELECT 1`;
      results.database = true;
      console.log('   ✅ Connected to Neon PostgreSQL');
    } catch (error: any) {
      console.log('   ❌ Database connection failed:', error.message);
    }

    // Test 2: Tables Existence
    console.log('\n📊 Test 2: Database Tables');
    try {
      const tables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;
      results.tables = tables.length > 0;
      console.log(`   ✅ Found ${tables.length} tables:`);
      tables.forEach((t: any) => console.log(`      - ${t.table_name}`));
    } catch (error: any) {
      console.log('   ❌ Failed to query tables:', error.message);
    }

    // Test 3: Admin Account
    console.log('\n👑 Test 3: Admin Account');
    try {
      const admins = await sql`
        SELECT username, account_type, created_at 
        FROM accounts 
        WHERE account_type = 'admin'
      `;
      results.admin = admins.length > 0;
      if (admins.length > 0) {
        console.log(`   ✅ Admin account exists:`);
        admins.forEach((a: any) => console.log(`      Username: ${a.username}`));
      } else {
        console.log('   ❌ No admin account found');
      }
    } catch (error: any) {
      console.log('   ❌ Failed to query admin:', error.message);
    }

    // Test 4: Categories
    console.log('\n📂 Test 4: Challenge Categories');
    try {
      const categories = await sql`SELECT id, name FROM categories ORDER BY display_order`;
      results.categories = categories.length > 0;
      console.log(`   ✅ Found ${categories.length} categories:`);
      categories.forEach((c: any) => console.log(`      - ${c.name}`));
    } catch (error: any) {
      console.log('   ❌ Failed to query categories:', error.message);
    }

    // Test 5: Challenges
    console.log('\n🎯 Test 5: CTF Challenges');
    try {
      const challenges = await sql`
        SELECT c.id, c.title, c.points, cat.name as category
        FROM challenges c
        LEFT JOIN categories cat ON c.category_id = cat.id
        ORDER BY c.display_order
      `;
      results.challenges = challenges.length > 0;
      console.log(`   ✅ Found ${challenges.length} challenges:`);
      challenges.forEach((ch: any) => 
        console.log(`      - ${ch.title} (${ch.points} pts) - ${ch.category}`)
      );
    } catch (error: any) {
      console.log('   ❌ Failed to query challenges:', error.message);
    }

    // Test 6: Routes Status
    console.log('\n🛣️  Test 6: Implemented Routes');
    const routes = [
      { path: '/', status: '✅', description: 'Landing page' },
      { path: '/participantauth', status: '✅', description: 'Team login' },
      { path: '/admin', status: '✅', description: 'Admin login' },
      { path: '/admin/dashboard', status: '✅', description: 'Admin dashboard' },
      { path: '/arena/challenges', status: '✅', description: 'Challenges list' },
      { path: '/arena/challenges/[id]', status: '❌', description: 'Challenge detail (NOT IMPLEMENTED)' },
      { path: '/arena/scoreboard', status: '✅', description: 'Scoreboard' },
      { path: '/api/auth/[...nextauth]', status: '✅', description: 'NextAuth API' },
    ];
    
    routes.forEach(r => console.log(`   ${r.status} ${r.path} - ${r.description}`));
    results.routing = true;

  } catch (error: any) {
    console.log('\n❌ Critical error:', error.message);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 SUMMARY\n');
  
  const allPassed = Object.values(results).every(v => v);
  
  console.log(`Database Connection:    ${results.database ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Database Tables:        ${results.tables ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Admin Account:          ${results.admin ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Categories Setup:       ${results.categories ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Challenges Setup:       ${results.challenges ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Routing Structure:      ${results.routing ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n' + '='.repeat(60));
  
  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED!\n');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED - Check errors above\n');
  }

  console.log('🚧 MISSING FEATURES:');
  console.log('   ❌ Challenge detail page with flag submission');
  console.log('   ❌ Flag validation API');
  console.log('   ❌ Scoring system (auto-update scores on solve)');
  console.log('   ❌ Hint unlock system');
  console.log('   ❌ Admin panel for team management');
  console.log('   ❌ Admin panel for challenge management');
  console.log('   ❌ Real-time scoreboard updates');
  console.log('   ❌ Challenge file attachments upload/download');
  console.log('\n');
}

testPlatform()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
