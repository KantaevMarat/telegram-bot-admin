import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('admin')
@Controller('admin/media')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload media file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    this.logger.log(`📤 Upload request received: ${file ? `${file.originalname} (${file.size} bytes, ${file.mimetype})` : 'NO FILE'}`);
    
    if (!file) {
      this.logger.error('❌ No file provided in upload request');
      throw new BadRequestException('No file provided');
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
    } catch (error) {
      this.logger.error(`❌ Failed to upload file: ${error.message}`, error.stack);
      throw error;
    }
  }
}
