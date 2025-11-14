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
exports.RankSettings = void 0;
const typeorm_1 = require("typeorm");
let RankSettings = class RankSettings {
};
exports.RankSettings = RankSettings;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], RankSettings.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], RankSettings.prototype, "bronze_requires_channels", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 10 }),
    __metadata("design:type", Number)
], RankSettings.prototype, "silver_required_tasks", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1 }),
    __metadata("design:type", Number)
], RankSettings.prototype, "silver_required_referrals", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 50 }),
    __metadata("design:type", Number)
], RankSettings.prototype, "gold_required_tasks", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 3 }),
    __metadata("design:type", Number)
], RankSettings.prototype, "gold_required_referrals", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 500 }),
    __metadata("design:type", Number)
], RankSettings.prototype, "platinum_price_usd", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 500 }),
    __metadata("design:type", Number)
], RankSettings.prototype, "platinum_price_rub", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 250 }),
    __metadata("design:type", Number)
], RankSettings.prototype, "platinum_price_uah", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 30 }),
    __metadata("design:type", Number)
], RankSettings.prototype, "platinum_duration_days", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], RankSettings.prototype, "stone_bonus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 3 }),
    __metadata("design:type", Number)
], RankSettings.prototype, "bronze_bonus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 7 }),
    __metadata("design:type", Number)
], RankSettings.prototype, "silver_bonus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 12 }),
    __metadata("design:type", Number)
], RankSettings.prototype, "gold_bonus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 20 }),
    __metadata("design:type", Number)
], RankSettings.prototype, "platinum_bonus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], RankSettings.prototype, "notification_80_percent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], RankSettings.prototype, "notification_gold_achieved", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], RankSettings.prototype, "notification_weekly_reminder", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], RankSettings.prototype, "notification_expiry_warning", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], RankSettings.prototype, "premium_info_message", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], RankSettings.prototype, "manager_username", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], RankSettings.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], RankSettings.prototype, "updated_at", void 0);
exports.RankSettings = RankSettings = __decorate([
    (0, typeorm_1.Entity)('rank_settings')
], RankSettings);
//# sourceMappingURL=rank-settings.entity.js.map