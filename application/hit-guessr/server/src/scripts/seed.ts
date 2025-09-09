import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  
  // You can add seed data here, for example:
  // await prisma.user.create({
  //   data: {
  //     email: 'demo@hitguessr.com',
  //     username: 'demo',
  //     password: '$2a$12$...' // hashed password
  //   }
  // });

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
