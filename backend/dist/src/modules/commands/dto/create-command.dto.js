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
exports.CreateCommandDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateCommandDto {
}
exports.CreateCommandDto = CreateCommandDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Command name (e.g., /mycommand)', example: '/mycommand' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCommandDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Command description' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCommandDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Response text when command is executed (legacy, for backward compatibility)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCommandDto.prototype, "response", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Media URL (photo or video) (legacy, for backward compatibility)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCommandDto.prototype, "media_url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Action type: text, media, url, function, command', required: false, default: 'text' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCommandDto.prototype, "action_type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Action payload (can be string or object depending on action type)', required: false }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateCommandDto.prototype, "action_payload", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Is active', required: false, default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateCommandDto.prototype, "active", void 0);
//# sourceMappingURL=create-command.dto.js.map