"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRank = exports.RankLevel = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
var RankLevel;
(function (RankLevel) {
    RankLevel["STONE"] = "stone";
    RankLevel["BRONZE"] = "bronze";
    RankLevel["SILVER"] = "silver";
    RankLevel["GOLD"] = "gold";
    RankLevel["PLATINUM"] = "platinum";
})(RankLevel || (exports.RankLevel = RankLevel = {}));
let UserRank = class UserRank {
};
exports.UserRank = UserRank;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], UserRank.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', unique: true }),
    __metadata("design:type", String)
], UserRank.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], UserRank.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: RankLevel,
        default: RankLevel.STONE,
    }),
    __metadata("design:type", String)
], UserRank.prototype, "current_rank", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], UserRank.prototype, "tasks_completed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], UserRank.prototype, "referrals_count", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], UserRank.prototype, "channels_subscribed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], UserRank.prototype, "bonus_percentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], UserRank.prototype, "platinum_expires_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], UserRank.prototype, "platinum_active", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], UserRank.prototype, "last_notification_sent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], UserRank.prototype, "notified_80_percent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], UserRank.prototype, "notified_gold_achieved", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], UserRank.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], UserRank.prototype, "updated_at", void 0);
exports.UserRank = UserRank = __decorate([
    (0, typeorm_1.Entity)('user_ranks')
], UserRank);
//# sourceMappingURL=user-rank.entity.js.map