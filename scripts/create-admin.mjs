// Simple script to create an admin user
// Usage: node scripts/create-admin.js

import('dotenv/config');

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function createAdminUser() {
  try {
    const { neon } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-http');
    
    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);
    
    console.log('Creating admin user...');
    
    const username = 'admin';
    const email = 'admin@example.com';
    const password = 'admin123'; // Change this password after first login!
    const fullName = 'Administrator';
    
    const passwordHash = await hashPassword(password);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    await db.execute(`
      INSERT INTO users (id, username, email, password_hash, role, full_name, created_at, updated_at)
      VALUES ('${userId}', '${username}', '${email}', '${passwordHash}', 'admin', '${fullName}', NOW(), NOW())
    `);
    
    console.log('✓ Admin user created successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log('  Username:', username);
    console.log('  Password:', password);
    console.log('  Email:', email);
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:');
    console.error(error.message);
    
    if (error.message.includes('duplicate key')) {
      console.log('\n💡 Admin user already exists. Use the password reset if needed.');
    }
    
    process.exit(1);
  }
}

createAdminUser();
