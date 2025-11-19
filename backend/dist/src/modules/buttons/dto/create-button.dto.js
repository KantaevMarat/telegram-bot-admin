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
exports.CreateButtonDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateButtonDto {
}
exports.CreateButtonDto = CreateButtonDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Button label', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateButtonDto.prototype, "label", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Action type', example: 'open_url' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateButtonDto.prototype, "action_type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Action payload', example: { url: 'https://example.com' } }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateButtonDto.prototype, "action_payload", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Row position', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateButtonDto.prototype, "row", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Column position', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateButtonDto.prototype, "col", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Media URL', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateButtonDto.prototype, "media_url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Command to execute when button is clicked (e.g., /start)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateButtonDto.prototype, "command", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Is active', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateButtonDto.prototype, "active", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Admin only button', required: false, default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateButtonDto.prototype, "admin_only", void 0);
//# sourceMappingURL=create-button.dto.js.map