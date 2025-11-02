import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Admin } from '../../entities/admin.entity';
export declare class AdminBotService implements OnModuleInit, OnModuleDestroy {
    private configService;
    private adminRepo;
    private readonly logger;
    private botToken;
    private webAppUrl;
    private isConfigured;
    private pollingInterval;
    private pollingOffset;
    constructor(configService: ConfigService, adminRepo: Repository<Admin>);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private setupMenuButton;
    sendWelcomeMessage(chatId: string, firstName: string, isAdmin?: boolean): Promise<void>;
    private getWebAppKeyboard;
    sendMessage(chatId: string, text: string, replyMarkup?: any): Promise<void>;
    handleMessage(message: any): Promise<void>;
    private sendQuickStats;
    private sendSystemInfo;
    private startPolling;
    private pollUpdates;
    notifyAdmin(adminTgId: string, message: string, keyboard?: any): Promise<void>;
    notifyAllAdmins(message: string, keyboard?: any): Promise<void>;
}
