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
exports.PayoutsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payout_entity_1 = require("../../entities/payout.entity");
const users_service_1 = require("../users/users.service");
let PayoutsService = class PayoutsService {
    constructor(payoutRepo, usersService) {
        this.payoutRepo = payoutRepo;
        this.usersService = usersService;
    }
    async create(userId, createPayoutDto) {
        const user = await this.usersService.findOne(userId);
        if (user.balance_usdt < createPayoutDto.amount) {
            throw new common_1.BadRequestException('Insufficient balance');
        }
        const payout = this.payoutRepo.create({
            user_id: userId,
            amount: createPayoutDto.amount,
            method: createPayoutDto.method,
            method_details: createPayoutDto.method_details,
            status: 'pending',
        });
        return await this.payoutRepo.save(payout);
    }
    async findAll(status, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const queryBuilder = this.payoutRepo
            .createQueryBuilder('payout')
            .leftJoinAndSelect('payout.user', 'user');
        if (status) {
            queryBuilder.where('payout.status = :status', { status });
        }
        const [payouts, total] = await queryBuilder
            .orderBy('payout.created_at', 'DESC')
            .skip(skip)
            .take(limit)
            .getManyAndCount();
        return {
            data: payouts,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async findOne(id) {
        const payout = await this.payoutRepo.findOne({
            where: { id },
            relations: ['user'],
        });
        if (!payout) {
            throw new common_1.NotFoundException('Payout not found');
        }
        return payout;
    }
    async approve(id, adminTgId) {
        const payout = await this.findOne(id);
        if (payout.status !== 'pending') {
            throw new common_1.BadRequestException('Payout is not pending');
        }
        const user = await this.usersService.findById(payout.user_id);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        await this.usersService.updateBalance(user.tg_id.toString(), -payout.amount, 'payout', adminTgId, `Payout approved: ${payout.id}`);
        payout.status = 'approved';
        payout.processed_by_admin_tg_id = adminTgId;
        return await this.payoutRepo.save(payout);
    }
    async decline(id, adminTgId, declineDto) {
        const payout = await this.findOne(id);
        if (payout.status !== 'pending') {
            throw new common_1.BadRequestException('Payout is not pending');
        }
        payout.status = 'declined';
        payout.reason_if_declined = declineDto.reason;
        payout.processed_by_admin_tg_id = adminTgId;
        return await this.payoutRepo.save(payout);
    }
};
exports.PayoutsService = PayoutsService;
exports.PayoutsService = PayoutsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payout_entity_1.Payout)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        users_service_1.UsersService])
], PayoutsService);
//# sourceMappingURL=payouts.service.js.map