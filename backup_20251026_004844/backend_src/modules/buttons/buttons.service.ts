import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Button } from '../../entities/button.entity';
import { CreateButtonDto } from './dto/create-button.dto';
import { UpdateButtonDto } from './dto/update-button.dto';

@Injectable()
export class ButtonsService {
  constructor(
    @InjectRepository(Button)
    private buttonRepo: Repository<Button>,
  ) {}

  async create(createButtonDto: CreateButtonDto) {
    const button = this.buttonRepo.create(createButtonDto);
    return await this.buttonRepo.save(button);
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
    return await this.buttonRepo.save(button);
  }

  async remove(id: string) {
    const button = await this.findOne(id);
    await this.buttonRepo.remove(button);
    return { success: true, message: 'Button removed' };
  }
}

