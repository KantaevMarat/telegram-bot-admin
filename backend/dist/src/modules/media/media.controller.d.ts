import { MediaService } from './media.service';
export declare class MediaController {
    private readonly mediaService;
    private readonly logger;
    constructor(mediaService: MediaService);
    uploadFile(file: Express.Multer.File): Promise<{
        success: boolean;
        url: string;
        filename: string;
        mimetype: string;
        size: number;
    }>;
}
