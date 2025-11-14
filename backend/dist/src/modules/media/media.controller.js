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
var MediaController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const media_service_1 = require("./media.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let MediaController = MediaController_1 = class MediaController {
    constructor(mediaService) {
        this.mediaService = mediaService;
        this.logger = new common_1.Logger(MediaController_1.name);
    }
    async uploadFile(file) {
        this.logger.log(`📤 Upload request received: ${file ? `${file.originalname} (${file.size} bytes, ${file.mimetype})` : 'NO FILE'}`);
        if (!file) {
            this.logger.error('❌ No file provided in upload request');
            throw new common_1.BadRequestException('No file provided');
        }
        try {
            const url = await this.mediaService.uploadFile(file);
            this.logger.log(`✅ File uploaded successfully: ${url}`);
            return {
                success: true,
                url,
                filename: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
            };
        }
        catch (error) {
            this.logger.error(`❌ Failed to upload file: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.MediaController = MediaController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload media file' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "uploadFile", null);
exports.MediaController = MediaController = MediaController_1 = __decorate([
    (0, swagger_1.ApiTags)('admin'),
    (0, common_1.Controller)('admin/media'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [media_service_1.MediaService])
], MediaController);
//# sourceMappingURL=media.controller.js.map