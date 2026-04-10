import { db } from './lib/db/index.js';
import { users } from './lib/db/schema.js';
import { hashPassword } from './lib/auth.js';

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    const username = 'admin';
    const email = 'admin@example.com';
    const password = 'admin123'; // Change this password after first login!
    const fullName = 'Administrator';
    
    const passwordHash = await hashPassword(password);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    await db.insert(users).values({
      id: userId,
      username,
      email,
      passwordHash,
      role: 'admin',
      fullName,
    });
    
    console.log('✓ Admin user created successfully!');
    console.log('Username:', username);
    console.log('Password:', password);
    console.log('Email:', email);
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
