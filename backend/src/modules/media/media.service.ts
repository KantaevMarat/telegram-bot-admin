import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private minioClient: Minio.Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
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

  private async initBucket() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Created bucket: ${this.bucketName}`);

        // Set bucket policy to public read
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
    } catch (error) {
      this.logger.error('Failed to initialize MinIO bucket', error);
    }
  }

  async uploadFile(file: Express.Multer.File, folder = 'uploads'): Promise<string> {
    const fileName = `${folder}/${uuidv4()}-${file.originalname}`;
    const metaData = {
      'Content-Type': file.mimetype,
    };

    this.logger.log(`📤 Uploading file to MinIO: bucket=${this.bucketName}, fileName=${fileName}, size=${file.size}`);

    try {
      await this.minioClient.putObject(this.bucketName, fileName, file.buffer, file.size, metaData);
      this.logger.log(`✅ File uploaded to MinIO: ${fileName}`);

      const url = await this.getFileUrl(fileName);
      this.logger.log(`🔗 File URL generated: ${url}`);
      return url;
    } catch (error) {
      this.logger.error(`❌ Failed to upload file to MinIO: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getFileUrl(fileName: string): Promise<string> {
    const endpoint = this.configService.get('MINIO_ENDPOINT', 'localhost');
    const port = this.configService.get('MINIO_PORT', '9000');
    const useSSL = this.configService.get('MINIO_USE_SSL', 'false') === 'true';
    const protocol = useSSL ? 'https' : 'http';

    return `${protocol}://${endpoint}:${port}/${this.bucketName}/${fileName}`;
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, fileName);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${fileName}`, error);
    }
  }
}
