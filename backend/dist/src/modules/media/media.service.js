"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MediaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const Minio = __importStar(require("minio"));
const uuid_1 = require("uuid");
let MediaService = MediaService_1 = class MediaService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(MediaService_1.name);
        this.bucketName = this.configService.get('MINIO_BUCKET', 'telegram-media');
        const endpoint = this.configService.get('MINIO_ENDPOINT', 'localhost');
        const port = parseInt(this.configService.get('MINIO_PORT', '9000'));
        const useSSL = this.configService.get('MINIO_USE_SSL', 'false') === 'true';
        const accessKey = this.configService.get('MINIO_ACCESS_KEY', 'minioadmin');
        const secretKey = this.configService.get('MINIO_SECRET_KEY', 'minioadmin');
        this.logger.log(`🔧 MinIO configuration: endpoint=${endpoint}, port=${port}, useSSL=${useSSL}, bucket=${this.bucketName}`);
        this.minioClient = new Minio.Client({
            endPoint: endpoint,
            port: port,
            useSSL: useSSL,
            accessKey: accessKey,
            secretKey: secretKey,
        });
        this.initBucket();
    }
    async initBucket() {
        try {
            const exists = await this.minioClient.bucketExists(this.bucketName);
            if (!exists) {
                await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
                this.logger.log(`Created bucket: ${this.bucketName}`);
                const policy = {
                    Version: '2012-10-17',
                    Statement: [
                        {
                            Effect: 'Allow',
                            Principal: { AWS: ['*'] },
                            Action: ['s3:GetObject'],
                            Resource: [`arn:aws:s3:::${this.bucketName}/*`],
                        },
                    ],
                };
                await this.minioClient.setBucketPolicy(this.bucketName, JSON.stringify(policy));
            }
        }
        catch (error) {
            this.logger.error('Failed to initialize MinIO bucket', error);
        }
    }
    async uploadFile(file, folder = 'uploads') {
        const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || 'bin';
        const fileName = `${folder}/${(0, uuid_1.v4)()}.${fileExtension}`;
        const metaData = {
            'Content-Type': file.mimetype,
            'Original-Name': Buffer.from(file.originalname).toString('base64'),
        };
        this.logger.log(`📤 Uploading file to MinIO: bucket=${this.bucketName}, fileName=${fileName}, originalName=${file.originalname}, size=${file.size}`);
        try {
            await this.minioClient.putObject(this.bucketName, fileName, file.buffer, file.size, metaData);
            this.logger.log(`✅ File uploaded to MinIO: ${fileName}`);
            const url = await this.getFileUrl(fileName);
            this.logger.log(`🔗 File URL generated: ${url}`);
            return url;
        }
        catch (error) {
            this.logger.error(`❌ Failed to upload file to MinIO: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getFileUrl(fileName) {
        const publicUrl = this.configService.get('MINIO_PUBLIC_URL');
        if (publicUrl) {
            return `${publicUrl}/${this.bucketName}/${fileName}`;
        }
        const endpoint = this.configService.get('MINIO_ENDPOINT', 'localhost');
        const port = this.configService.get('MINIO_PORT', '9000');
        const useSSL = this.configService.get('MINIO_USE_SSL', 'false') === 'true';
        const protocol = useSSL ? 'https' : 'http';
        return `${protocol}://${endpoint}:${port}/${this.bucketName}/${fileName}`;
    }
    async deleteFile(fileName) {
        try {
            await this.minioClient.removeObject(this.bucketName, fileName);
        }
        catch (error) {
            this.logger.error(`Failed to delete file: ${fileName}`, error);
        }
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = MediaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MediaService);
//# sourceMappingURL=media.service.js.map