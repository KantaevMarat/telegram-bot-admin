import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
export declare class SettingsController {
    private readonly settingsService;
    constructor(settingsService: SettingsService);
    findAll(): Promise<import("../../entities/settings.entity").Settings[]>;
    findOne(key: string): Promise<import("../../entities/settings.entity").Settings | null>;
    updateOne(key: string, body: {
        value: string;
    }, req: any, headers: any): Promise<import("../../entities/settings.entity").Settings>;
    updateAll(body: {
        settings: UpdateSettingDto[];
    }, req: any, headers: any): Promise<import("../../entities/settings.entity").Settings[]>;
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
    getSettingsByCategory(category: string): Promise<import("../../entities/settings.entity").Settings[]>;
    validateSettings(body: {
        settings: UpdateSettingDto[];
    }): Promise<{
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
    importSettings(body: {
        settings: any[];
    }, req: any, headers: any): Promise<{
        total: number;
        successful: number;
        failed: number;
        results: any[];
    }>;
    resetSettings(body: {
        categories?: string[];
    }, req: any, headers: any): Promise<{
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
    getSettingsHistory(limit?: string, offset?: string): Promise<{
        total: number;
        limit: number;
        offset: number;
        changes: import("../../entities/settings-history.entity").SettingsHistory[];
    }>;
    searchSettings(query: string, category?: string): Promise<import("../../entities/settings.entity").Settings[]>;
    bulkUpdateSettings(body: {
        settings: UpdateSettingDto[];
    }, req: any, headers: any): Promise<{
        success: boolean;
        errors: any[];
        updated?: undefined;
        settings?: undefined;
    } | {
        success: boolean;
        updated: number;
        settings: import("../../entities/settings.entity").Settings[];
        errors?: undefined;
    }>;
}
