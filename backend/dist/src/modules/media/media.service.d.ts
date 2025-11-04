import { ConfigService } from '@nestjs/config';
export declare class MediaService {
    private configService;
    private readonly logger;
    private minioClient;
    private bucketName;
    constructor(configService: ConfigService);
    private initBucket;
    uploadFile(file: Express.Multer.File, folder?: string): Promise<string>;
    getFileUrl(fileName: string): Promise<string>;
    deleteFile(fileName: string): Promise<void>;
}
