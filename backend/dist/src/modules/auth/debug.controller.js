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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const admin_entity_1 = require("../../entities/admin.entity");
let DebugController = class DebugController {
    constructor(adminRepo) {
        this.adminRepo = adminRepo;
    }
    async getAllAdmins() {
        const admins = await this.adminRepo.find();
        return {
            count: admins.length,
            admins: admins.map(a => ({
                id: a.id,
                tg_id: a.tg_id,
                tg_id_type: typeof a.tg_id,
                role: a.role,
                username: a.username,
            })),
        };
    }
    async testFind() {
        const searchTgId = '697184435';
        const byString = await this.adminRepo.findOne({
            where: { tg_id: searchTgId },
        });
        const byNumber = await this.adminRepo.findOne({
            where: { tg_id: 697184435 },
        });
        const all = await this.adminRepo.find();
        return {
            searchingFor: searchTgId,
            foundByString: byString ? 'YES' : 'NO',
            foundByNumber: byNumber ? 'YES' : 'NO',
            allAdmins: all.map(a => ({
                tg_id: a.tg_id,
                matches: a.tg_id === searchTgId,
                strictMatches: a.tg_id === searchTgId,
            })),
        };
    }
};
exports.DebugController = DebugController;
__decorate([
    (0, common_1.Get)('admins'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DebugController.prototype, "getAllAdmins", null);
__decorate([
    (0, common_1.Get)('test-find'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DebugController.prototype, "testFind", null);
exports.DebugController = DebugController = __decorate([
    (0, common_1.Controller)('debug'),
    __param(0, (0, typeorm_1.InjectRepository)(admin_entity_1.Admin)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], DebugController);
//# sourceMappingURL=debug.controller.js.map