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
    // Извлекаем расширение файла
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || 'bin';
    // Используем только UUID + расширение, без оригинального имени (избегаем проблем с кириллицей и спецсимволами)
    const fileName = `${folder}/${uuidv4()}.${fileExtension}`;
    
    const metaData = {
      'Content-Type': file.mimetype,
      // Сохраняем оригинальное имя в метаданных для справки
      'Original-Name': Buffer.from(file.originalname).toString('base64'),
    };

    this.logger.log(`📤 Uploading file to MinIO: bucket=${this.bucketName}, fileName=${fileName}, originalName=${file.originalname}, size=${file.size}`);

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
    try {
      // Генерируем presigned URL для публичного доступа (валиден 7 дней)
      // Это безопаснее чем делать bucket публичным
      const presignedUrl = await this.minioClient.presignedGetObject(
        this.bucketName,
        fileName,
        7 * 24 * 60 * 60, // 7 дней в секундах
      );

      this.logger.debug(`🔗 Generated presigned URL: ${presignedUrl.substring(0, 100)}...`);

      // Для локальной разработки заменяем внутренний Docker endpoint на localhost
      const nodeEnv = this.configService.get('NODE_ENV', 'development');
      if (nodeEnv === 'development') {
        // Заменяем minio:9000 на localhost:9002 (внешний порт из docker-compose.dev.yml)
        const devUrl = presignedUrl.replace('minio:9000', 'localhost:9002');
        this.logger.debug(`🔗 Development URL: ${devUrl.substring(0, 100)}...`);
        return devUrl;
      }

      // Для production ОБЯЗАТЕЛЬНО используем публичный URL
      // Telegram API не может скачать файлы по внутренним Docker адресам
      const publicUrl = this.configService.get('MINIO_PUBLIC_URL');
      if (publicUrl) {
        // Заменяем internal endpoint на публичный
        const internalEndpoint = this.configService.get('MINIO_ENDPOINT', 'minio');
        const port = this.configService.get('MINIO_PORT', '9000');
        const internalPattern = `${internalEndpoint}:${port}`;
        const publicHost = publicUrl.replace(/^https?:\/\//, '');
        
        // Заменяем внутренний адрес на публичный
        let finalUrl = presignedUrl.replace(internalPattern, publicHost);
        
        // Если presigned URL использует HTTP, но publicUrl - HTTPS, заменяем протокол
        if (publicUrl.startsWith('https://') && finalUrl.startsWith('http://')) {
          finalUrl = finalUrl.replace('http://', 'https://');
        }
        
        this.logger.debug(`🔗 Production public URL: ${finalUrl.substring(0, 100)}...`);
        return finalUrl;
      }

      // Если MINIO_PUBLIC_URL не задан в production - это ошибка конфигурации
      this.logger.warn(`⚠️ MINIO_PUBLIC_URL not set in production! URL may not be accessible to Telegram API: ${presignedUrl.substring(0, 100)}...`);
      return presignedUrl;
    } catch (error) {
      this.logger.error(`❌ Failed to generate presigned URL for ${fileName}: ${error.message}`);
      throw error;
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, fileName);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${fileName}`, error);
    }
  }
}
