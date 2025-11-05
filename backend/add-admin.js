const { DataSource } = require('typeorm');
require('dotenv').config();

const tgId = process.argv[2] || '697184435';
const username = process.argv[3] || 'admin';
const firstName = process.argv[4] || 'Admin';

async function addAdmin() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    // Check if admin exists
    const existingAdmin = await dataSource.query(
      'SELECT * FROM admins WHERE tg_id = $1',
      [tgId]
    );

    if (existingAdmin.length > 0) {
      console.log('ℹ️ Admin already exists:');
      console.log(JSON.stringify(existingAdmin[0], null, 2));
      
      // Update role to admin if needed
      if (existingAdmin[0].role !== 'admin') {
        await dataSource.query(
          'UPDATE admins SET role = $1 WHERE tg_id = $2',
          ['admin', tgId]
        );
        console.log('✅ Admin role updated to "admin"');
      } else {
        console.log('✅ Admin already has "admin" role');
      }
    } else {
      // Insert new admin
      const result = await dataSource.query(
        `INSERT INTO admins (tg_id, username, first_name, role, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [tgId, username, firstName, 'admin']
      );
      console.log('✅ Admin created:');
      console.log(JSON.stringify(result[0], null, 2));
    }

    // Show all admins
    const allAdmins = await dataSource.query('SELECT * FROM admins ORDER BY created_at DESC');
    console.log('\n📋 All admins:');
    allAdmins.forEach((admin, i) => {
      console.log(`${i + 1}. tg_id: ${admin.tg_id}, username: ${admin.username}, role: ${admin.role}`);
    });

    await dataSource.destroy();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addAdmin();

