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
exports.CreateScenarioDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateScenarioDto {
}
exports.CreateScenarioDto = CreateScenarioDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Scenario name' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateScenarioDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Trigger (command or button id)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateScenarioDto.prototype, "trigger", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Response text (simple scenarios)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateScenarioDto.prototype, "response", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Steps array (advanced scenarios)',
        example: [
            { type: 'message', text: 'Hello {username}!' },
            { type: 'delay', ms: 1000 },
            { type: 'message', text: 'Your balance: {balance}' },
        ],
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], CreateScenarioDto.prototype, "steps", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Is active', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateScenarioDto.prototype, "is_active", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Is active (alias)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateScenarioDto.prototype, "active", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Media file URL (photo or video)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateScenarioDto.prototype, "media_url", void 0);
//# sourceMappingURL=create-scenario.dto.js.map