"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const schedule_1 = require("@nestjs/schedule");
const bullmq_1 = require("@nestjs/bullmq");
const auth_module_1 = require("./modules/auth/auth.module");
const admin_module_1 = require("./modules/admin/admin.module");
const bot_module_1 = require("./modules/bot/bot.module");
const users_module_1 = require("./modules/users/users.module");
const stats_module_1 = require("./modules/stats/stats.module");
const messages_module_1 = require("./modules/messages/messages.module");
const buttons_module_1 = require("./modules/buttons/buttons.module");
const scenarios_module_1 = require("./modules/scenarios/scenarios.module");
const tasks_module_1 = require("./modules/tasks/tasks.module");
const payouts_module_1 = require("./modules/payouts/payouts.module");
const balance_module_1 = require("./modules/balance/balance.module");
const settings_module_1 = require("./modules/settings/settings.module");
const broadcast_module_1 = require("./modules/broadcast/broadcast.module");
const sync_module_1 = require("./modules/sync/sync.module");
const channels_module_1 = require("./modules/channels/channels.module");
const typeorm_config_1 = require("./config/typeorm.config");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '../.env',
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => (0, typeorm_config_1.typeOrmConfig)(configService),
                inject: [config_1.ConfigService],
            }),
            schedule_1.ScheduleModule.forRoot(),
            bullmq_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    connection: {
                        host: configService.get('REDIS_HOST', 'localhost'),
                        port: configService.get('REDIS_PORT', 6379),
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            sync_module_1.SyncModule,
            auth_module_1.AuthModule,
            admin_module_1.AdminModule,
            bot_module_1.BotModule,
            users_module_1.UsersModule,
            stats_module_1.StatsModule,
            messages_module_1.MessagesModule,
            buttons_module_1.ButtonsModule,
            scenarios_module_1.ScenariosModule,
            tasks_module_1.TasksModule,
            payouts_module_1.PayoutsModule,
            balance_module_1.BalanceModule,
            settings_module_1.SettingsModule,
            broadcast_module_1.BroadcastModule,
            channels_module_1.ChannelsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map