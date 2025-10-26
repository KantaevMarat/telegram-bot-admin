"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const typeorm_config_1 = require("../config/typeorm.config");
const user_entity_1 = require("../entities/user.entity");
const admin_entity_1 = require("../entities/admin.entity");
const task_entity_1 = require("../entities/task.entity");
const fake_stats_entity_1 = require("../entities/fake-stats.entity");
const real_stats_snapshot_entity_1 = require("../entities/real-stats-snapshot.entity");
const init_settings_1 = require("./init-settings");
async function seed() {
    const dataSource = new typeorm_1.DataSource(typeorm_config_1.dataSourceOptions);
    await dataSource.initialize();
    console.log('🌱 Seeding database...');
    await (0, init_settings_1.initializeSettings)(dataSource);
    const userRepo = dataSource.getRepository(user_entity_1.User);
    const testUsers = [
        {
            tg_id: '111111111',
            username: 'test_user_1',
            first_name: 'Test',
            last_name: 'User 1',
            balance_usdt: 50,
            tasks_completed: 3,
            total_earned: 75,
            status: 'active',
        },
        {
            tg_id: '222222222',
            username: 'test_user_2',
            first_name: 'Test',
            last_name: 'User 2',
            balance_usdt: 120,
            tasks_completed: 8,
            total_earned: 200,
            status: 'active',
        },
        {
            tg_id: '333333333',
            username: 'test_user_3',
            first_name: 'Test',
            last_name: 'User 3',
            balance_usdt: 25,
            tasks_completed: 2,
            total_earned: 30,
            status: 'active',
        },
    ];
    for (const userData of testUsers) {
        const exists = await userRepo.findOne({ where: { tg_id: userData.tg_id } });
        if (!exists) {
            await userRepo.save(userData);
            console.log(`✅ Created user: ${userData.username}`);
        }
    }
    const adminRepo = dataSource.getRepository(admin_entity_1.Admin);
    const testAdmin = {
        tg_id: '6971844353',
        role: 'superadmin',
        username: 'nabi_arabic',
        first_name: '𝓜𝓪𝓱𝓶𝓾𝓭',
    };
    const adminExists = await adminRepo.findOne({ where: { tg_id: testAdmin.tg_id } });
    if (!adminExists) {
        await adminRepo.save(testAdmin);
        console.log(`✅ Created admin: ${testAdmin.username}`);
    }
    const taskRepo = dataSource.getRepository(task_entity_1.Task);
    const sampleTasks = [
        {
            title: 'Подписаться на канал',
            description: 'Подпишитесь на наш Telegram канал',
            reward_min: 5,
            reward_max: 10,
            max_per_user: 1,
            active: true,
        },
        {
            title: 'Пригласить друга',
            description: 'Пригласите друга по реферальной ссылке',
            reward_min: 10,
            reward_max: 15,
            max_per_user: 10,
            active: true,
        },
        {
            title: 'Ежедневный бонус',
            description: 'Получите ежедневный бонус',
            reward_min: 2,
            reward_max: 5,
            max_per_user: 1,
            cooldown_hours: 24,
            active: true,
        },
    ];
    for (const taskData of sampleTasks) {
        const exists = await taskRepo.findOne({ where: { title: taskData.title } });
        if (!exists) {
            await taskRepo.save(taskData);
            console.log(`✅ Created task: ${taskData.title}`);
        }
    }
    const fakeStatsRepo = dataSource.getRepository(fake_stats_entity_1.FakeStats);
    const fakeStatsExists = await fakeStatsRepo.count();
    if (fakeStatsExists === 0) {
        await fakeStatsRepo.save({
            online: 1250,
            active: 8420,
            paid_usdt: 45678.5,
        });
        console.log('✅ Created initial fake stats');
    }
    const realStatsRepo = dataSource.getRepository(real_stats_snapshot_entity_1.RealStatsSnapshot);
    const realStatsExists = await realStatsRepo.count();
    if (realStatsExists === 0) {
        const usersCount = await userRepo.count();
        const totalBalance = await userRepo
            .createQueryBuilder('user')
            .select('SUM(user.balance_usdt)', 'total')
            .getRawOne();
        const totalEarned = await userRepo
            .createQueryBuilder('user')
            .select('SUM(user.total_earned)', 'total')
            .getRawOne();
        await realStatsRepo.save({
            users_count: usersCount,
            total_balance: totalBalance?.total || 0,
            total_earned: totalEarned?.total || 0,
            active_users_24h: usersCount,
        });
        console.log('✅ Created initial real stats snapshot');
    }
    await dataSource.destroy();
    console.log('🎉 Seeding completed!');
}
seed().catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map