import { sequelize, syncDatabase } from '../src/models/dbModels.js';
import dotenv from 'dotenv';

dotenv.config();

const migrate = async () => {
  const command = process.argv[2] || 'status';

  try {
    console.log('🔄 Running migration command:', command);
    console.log('📊 Environment:', process.env.NODE_ENV || 'development');

    switch (command) {
      case 'sync':
        if (process.env.NODE_ENV === 'production') {
          console.error('❌ Cannot sync in production! Use migrations instead.');
          process.exit(1);
        }
        
        console.log('🔄 Syncing database...');
        await syncDatabase();
        console.log('✅ Database synced successfully');
        break;

      case 'reset':
        if (process.env.NODE_ENV === 'production') {
          console.error('❌ Cannot reset database in production!');
          process.exit(1);
        }

        console.log('⚠️  WARNING: This will drop all tables!');
        console.log('⚠️  Press Ctrl+C to cancel or wait 5 seconds...');
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('🗑️  Dropping all tables...');
        await sequelize.drop();
        console.log('✅ All tables dropped');
        
        console.log('🔄 Recreating tables...');
        await syncDatabase();
        console.log('✅ Database reset complete');
        break;

      case 'status':
        console.log('🔍 Checking database connection...');
        await sequelize.authenticate();
        console.log('✅ Database connection OK');
        
        // Get table list
        const [tables] = await sequelize.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          ORDER BY table_name
        `);
        
        console.log('\n📋 Existing tables:');
        tables.forEach(({ table_name }) => {
          console.log(`   - ${table_name}`);
        });
        break;

      case 'seed':
        console.log('🌱 Seeding database...');
        await seedDatabase();
        console.log('✅ Database seeded successfully');
        break;

      default:
        console.error('❌ Unknown command:', command);
        console.log('\nAvailable commands:');
        console.log('  sync   - Sync database schema');
        console.log('  reset  - Drop and recreate all tables');
        console.log('  status - Check database connection');
        console.log('  seed   - Seed initial data');
        process.exit(1);
    }

    console.log('\n✅ Migration completed successfully');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
};

// Seed initial data
const seedDatabase = async () => {
  const { Role, User } = await import('../src/models/index.js');
  const bcrypt = await import('bcryptjs');

  // Seed roles
  const roles = [
    { role_id: 1, role_name: 'OWNER' },
    { role_id: 2, role_name: 'ADMIN' },
    { role_id: 3, role_name: 'USER' },
    { role_id: 4, role_name: 'VIEWER' },
    { role_id: 5, role_name: 'AUDITOR' }
  ];

  for (const role of roles) {
    await Role.findOrCreate({
      where: { role_id: role.role_id },
      defaults: role
    });
  }
  console.log('✅ Roles seeded');

  // Seed admin user (if not exists)
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

  const [adminUser, created] = await User.findOrCreate({
    where: { email: adminEmail },
    defaults: {
      email: adminEmail,
      password_hash: await bcrypt.hash(adminPassword, 10),
      name: 'Admin',
      surname: 'User',
      full_name: 'Admin User',
      sex: 'O',
      role_id: 2, // ADMIN role
      is_active: true
    }
  });

  if (created) {
    console.log('✅ Admin user created:', adminEmail);
    console.log('⚠️  Default password:', adminPassword);
    console.log('⚠️  Please change this password immediately!');
  } else {
    console.log('ℹ️  Admin user already exists');
  }
};

// Run migration
migrate();