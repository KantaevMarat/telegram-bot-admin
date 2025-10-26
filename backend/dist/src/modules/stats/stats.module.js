"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const stats_service_1 = require("./stats.service");
const stats_controller_1 = require("./stats.controller");
const fake_stats_service_1 = require("./fake-stats.service");
const fake_stats_entity_1 = require("../../entities/fake-stats.entity");
const real_stats_snapshot_entity_1 = require("../../entities/real-stats-snapshot.entity");
const user_entity_1 = require("../../entities/user.entity");
const payout_entity_1 = require("../../entities/payout.entity");
let StatsModule = class StatsModule {
};
exports.StatsModule = StatsModule;
exports.StatsModule = StatsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([fake_stats_entity_1.FakeStats, real_stats_snapshot_entity_1.RealStatsSnapshot, user_entity_1.User, payout_entity_1.Payout])],
        controllers: [stats_controller_1.StatsController],
        providers: [stats_service_1.StatsService, fake_stats_service_1.FakeStatsService],
        exports: [stats_service_1.StatsService, fake_stats_service_1.FakeStatsService],
    })
], StatsModule);
//# sourceMappingURL=stats.module.js.map