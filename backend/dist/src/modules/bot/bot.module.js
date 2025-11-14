"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const bot_service_1 = require("./bot.service");
const admin_bot_service_1 = require("./admin-bot.service");
const bot_controller_1 = require("./bot.controller");
const user_entity_1 = require("../../entities/user.entity");
const admin_entity_1 = require("../../entities/admin.entity");
const button_entity_1 = require("../../entities/button.entity");
const task_entity_1 = require("../../entities/task.entity");
const user_task_entity_1 = require("../../entities/user-task.entity");
const message_entity_1 = require("../../entities/message.entity");
const scenario_entity_1 = require("../../entities/scenario.entity");
const fake_stats_entity_1 = require("../../entities/fake-stats.entity");
const settings_entity_1 = require("../../entities/settings.entity");
const balance_log_entity_1 = require("../../entities/balance-log.entity");
const users_module_1 = require("../users/users.module");
const stats_module_1 = require("../stats/stats.module");
const settings_module_1 = require("../settings/settings.module");
const messages_module_1 = require("../messages/messages.module");
const channels_module_1 = require("../channels/channels.module");
const commands_module_1 = require("../commands/commands.module");
const ranks_module_1 = require("../ranks/ranks.module");
const premium_module_1 = require("../premium/premium.module");
let BotModule = class BotModule {
};
exports.BotModule = BotModule;
exports.BotModule = BotModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                user_entity_1.User,
                admin_entity_1.Admin,
                button_entity_1.Button,
                task_entity_1.Task,
                user_task_entity_1.UserTask,
                message_entity_1.Message,
                scenario_entity_1.Scenario,
                fake_stats_entity_1.FakeStats,
                settings_entity_1.Settings,
                balance_log_entity_1.BalanceLog,
            ]),
            users_module_1.UsersModule,
            stats_module_1.StatsModule,
            settings_module_1.SettingsModule,
            (0, common_1.forwardRef)(() => messages_module_1.MessagesModule),
            channels_module_1.ChannelsModule,
            (0, common_1.forwardRef)(() => commands_module_1.CommandsModule),
            (0, common_1.forwardRef)(() => ranks_module_1.RanksModule),
            (0, common_1.forwardRef)(() => premium_module_1.PremiumModule),
        ],
        controllers: [bot_controller_1.BotController],
        providers: [bot_service_1.BotService, admin_bot_service_1.AdminBotService],
        exports: [bot_service_1.BotService, admin_bot_service_1.AdminBotService],
    })
], BotModule);
//# sourceMappingURL=bot.module.js.map