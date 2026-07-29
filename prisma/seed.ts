import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.registration.deleteMany();
  await prisma.event.deleteMany();

  await prisma.event.createMany({
    data: [
      {
        title: 'Spring Career Fair',
        description: 'Annual spring career fair connecting candidates with top employers.',
        start_date: new Date('2026-08-10T09:00:00.000Z'),
        end_date: new Date('2026-08-10T17:00:00.000Z'),
        location: 'Main Hall',
        capacity: 200,
        current_registrations: 198,
        status: 'Published',
      },
      {
        title: 'Tech Employer Meetup',
        description: 'Focused meetup for engineering and product roles.',
        start_date: new Date('2026-08-15T10:00:00.000Z'),
        end_date: new Date('2026-08-15T15:00:00.000Z'),
        location: 'Conference Room B',
        capacity: 60,
        current_registrations: 12,
        status: 'Published',
      },
      {
        title: 'Legacy Finance Fair',
        description: 'Finance sector career fair.',
        start_date: new Date('2026-08-20T09:00:00.000Z'),
        end_date: new Date('2026-08-20T13:00:00.000Z'),
        location: 'Main Hall',
        capacity: 150,
        current_registrations: 40,
        status: 'Cancelled',
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
