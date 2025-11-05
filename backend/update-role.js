const { DataSource } = require('typeorm');
require('dotenv').config();

const tgId = process.argv[2];
const newRole = process.argv[3] || 'superadmin';

async function updateRole() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    const result = await dataSource.query(
      'UPDATE admins SET role = $1 WHERE tg_id = $2 RETURNING *',
      [newRole, tgId]
    );

    if (result.length > 0) {
      console.log(`✅ Role updated to "${newRole}":`);
      console.log(JSON.stringify(result[0], null, 2));
    } else {
      console.log('❌ Admin not found');
    }

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (!tgId) {
  console.error('Usage: node update-role.js <tg_id> [role]');
  process.exit(1);
}

updateRole();

