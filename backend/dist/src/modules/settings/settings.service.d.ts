import { Repository } from 'typeorm';
import { Settings } from '../../entities/settings.entity';
import { SettingsHistory } from '../../entities/settings-history.entity';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { SyncService } from '../sync/sync.service';
export declare class SettingsService {
    private settingsRepository;
    private settingsHistoryRepository;
    private syncService;
    constructor(settingsRepository: Repository<Settings>, settingsHistoryRepository: Repository<SettingsHistory>, syncService: SyncService);
    findAll(): Promise<Settings[]>;
    findOne(key: string): Promise<Settings | null>;
    upsert(key: string, value: string, adminTgId?: string, adminUsername?: string, adminFirstName?: string, changeReason?: string, ipAddress?: string, userAgent?: string): Promise<Settings>;
    updateOne(key: string, value: string, adminTgId: string, adminUsername?: string, adminFirstName?: string, changeReason?: string, ipAddress?: string, userAgent?: string): Promise<Settings>;
    updateAll(settings: UpdateSettingDto[], adminTgId: string, adminUsername?: string, adminFirstName?: string, changeReason?: string, ipAddress?: string, userAgent?: string): Promise<Settings[]>;
    getValue(key: string, defaultValue?: string): Promise<string>;
    remove(key: string): Promise<{
        success: boolean;
    }>;
    getSettingsByCategories(): Promise<{
        bot: {
            name: string;
            icon: string;
            settings: never[];
        };
        users: {
            name: string;
            icon: string;
            settings: never[];
        };
        financial: {
            name: string;
            icon: string;
            settings: never[];
        };
        security: {
            name: string;
            icon: string;
            settings: never[];
        };
        monitoring: {
            name: string;
            icon: string;
            settings: never[];
        };
        content: {
            name: string;
            icon: string;
            settings: never[];
        };
        integrations: {
            name: string;
            icon: string;
            settings: never[];
        };
        fake: {
            name: string;
            icon: string;
            settings: never[];
        };
    }>;
    getSettingsByCategory(category: string): Promise<Settings[]>;
    validateSettings(settings: UpdateSettingDto[]): Promise<{
        valid: boolean;
        results: any[];
    }>;
    exportSettings(): Promise<{
        exportDate: string;
        totalSettings: number;
        settings: {
            key: string;
            value: string;
            description: string;
        }[];
    }>;
    importSettings(settings: any[], adminTgId: string, adminUsername?: string, adminFirstName?: string, changeReason?: string, ipAddress?: string, userAgent?: string): Promise<{
        total: number;
        successful: number;
        failed: number;
        results: any[];
    }>;
    resetSettings(categories?: string[], adminTgId?: string, adminUsername?: string, adminFirstName?: string, changeReason?: string, ipAddress?: string, userAgent?: string): Promise<{
        success: boolean;
        message: string;
        totalSettings: number;
        resetCount: number;
        skippedCount: number;
        failedCount: number;
        categories: string[];
        resetBy: string | undefined;
        adminUsername: string | undefined;
        adminFirstName: string | undefined;
        timestamp: string;
        details: {
            key: string;
            oldValue: string;
            newValue: string;
            reset: boolean;
        }[];
    }>;
    getSettingsHistory(limit?: number, offset?: number): Promise<{
        total: number;
        limit: number;
        offset: number;
        changes: SettingsHistory[];
    }>;
    searchSettings(query: string, category?: string): Promise<Settings[]>;
    bulkUpdateSettings(settings: UpdateSettingDto[], adminTgId: string, adminUsername?: string, adminFirstName?: string, changeReason?: string, ipAddress?: string, userAgent?: string): Promise<{
        success: boolean;
        errors: any[];
        updated?: undefined;
        settings?: undefined;
    } | {
        success: boolean;
        updated: number;
        settings: Settings[];
        errors?: undefined;
    }>;
    private getSettingCategory;
    private groupSettingsByCategory;
    private recordHistory;
}
