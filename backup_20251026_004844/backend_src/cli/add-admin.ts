import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../config/typeorm.config';
import { Admin } from '../entities/admin.entity';

async function addAdmin() {
  const tgId = process.argv[2];

  if (!tgId) {
    console.error('❌ Please provide Telegram ID as argument');
    console.log('Usage: npm run cli:add-admin <TELEGRAM_ID>');
    process.exit(1);
  }

  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  const adminRepo = dataSource.getRepository(Admin);

  const exists = await adminRepo.findOne({ where: { tg_id: tgId } });
  if (exists) {
    console.log(`⚠️  Admin with Telegram ID ${tgId} already exists`);
    await dataSource.destroy();
    process.exit(0);
  }

  await adminRepo.save({
    tg_id: tgId,
    role: 'superadmin',
  });

  console.log(`✅ Admin with Telegram ID ${tgId} created successfully`);

  await dataSource.destroy();
}

addAdmin().catch((error) => {
  console.error('❌ Error adding admin:', error);
  process.exit(1);
});

