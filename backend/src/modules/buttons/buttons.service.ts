import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Button } from '../../entities/button.entity';
import { CreateButtonDto } from './dto/create-button.dto';
import { UpdateButtonDto } from './dto/update-button.dto';
import { SyncService } from '../sync/sync.service';

@Injectable()
export class ButtonsService {
  constructor(
    @InjectRepository(Button)
    private buttonRepo: Repository<Button>,
    private syncService: SyncService,
  ) {}

  async create(createButtonDto: CreateButtonDto) {
    const button = this.buttonRepo.create(createButtonDto);
    const saved = await this.buttonRepo.save(button);
    
    // Emit sync event
    await this.syncService.emitEntityEvent('buttons', 'created', saved);
    
    return saved;
  }

  async findAll(active?: boolean) {
    const where = active !== undefined ? { active } : {};
    return await this.buttonRepo.find({
      where,
      order: { row: 'ASC', col: 'ASC' },
    });
  }

  async findOne(id: string) {
    const button = await this.buttonRepo.findOne({ where: { id } });
    if (!button) {
      throw new NotFoundException('Button not found');
    }
    return button;
  }

  async update(id: string, updateButtonDto: UpdateButtonDto) {
    const button = await this.findOne(id);
    Object.assign(button, updateButtonDto);
    const updated = await this.buttonRepo.save(button);
    
    // Emit sync event
    await this.syncService.emitEntityEvent('buttons', 'updated', updated);
    
    return updated;
  }

  async remove(id: string) {
    const button = await this.findOne(id);
    await this.buttonRepo.remove(button);
    
    // Emit sync event
    await this.syncService.emitEntityEvent('buttons', 'deleted', { id });
    
    return { success: true, message: 'Button removed' };
  }

  async testButton(id: string, testData?: any) {
    const button = await this.findOne(id);
    
    // Симуляция выполнения кнопки
    const result = {
      success: true,
      payload: {
        button_id: button.id,
        label: button.label,
        action_type: button.action_type,
        action_payload: button.action_payload,
        command: button.command,
      },
      response: {
        message: 'Кнопка выполнена успешно',
        timestamp: new Date().toISOString(),
      },
      logs: [
        `[${new Date().toISOString()}] Button ${button.id} executed`,
        `Action type: ${button.action_type}`,
        `Command: ${button.command || 'N/A'}`,
      ],
    };

    return result;
  }

  async testButtonConfig(config: any) {
    // Валидация конфигурации
    if (!config.label || config.label.length === 0) {
      return {
        success: false,
        error: 'Label is required',
      };
    }

    if (config.label.length > 64) {
      return {
        success: false,
        error: 'Label must not exceed 64 characters',
      };
    }

    // Симуляция выполнения
    const result = {
      success: true,
      payload: {
        config,
        test_user_id: 'test_user',
        test_chat_id: 'test_chat',
      },
      response: {
        message: 'Configuration test successful',
        timestamp: new Date().toISOString(),
      },
      logs: [
        `[${new Date().toISOString()}] Testing button configuration`,
        `Mode: ${config.mode || 'N/A'}`,
        `Label: ${config.label}`,
      ],
    };

    return result;
  }

  async exportButton(id: string) {
    const button = await this.findOne(id);
    
    // Экспорт в JSON формат
    const exportData = {
      id: button.id,
      label: button.label,
      action_type: button.action_type,
      action_payload: button.action_payload,
      media_url: button.media_url,
      command: button.command,
      row: button.row,
      col: button.col,
      active: button.active,
      created_at: button.created_at,
      updated_at: button.updated_at,
    };

    return exportData;
  }
}
