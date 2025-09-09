import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  
  // Create a demo user
  const hashedPassword = await bcrypt.hash('demo123', 12);
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@hitguessr.com' },
    update: {},
    create: {
      email: 'demo@hitguessr.com',
      username: 'demo',
      password: hashedPassword
    }
  });

  console.log(`✅ Created demo user: ${demoUser.username}`);
  console.log('📧 Email: demo@hitguessr.com');
  console.log('🔑 Password: demo123');
  console.log('✅ Database seeded successfully');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
