export interface DefaultSetting {
    key: string;
    value: string;
    description: string;
    category?: string;
}
export declare const DEFAULT_SETTINGS: DefaultSetting[];
export declare function getDefaultSettingsMap(): Map<string, DefaultSetting>;
export declare function getDefaultValue(key: string): string | undefined;
export declare function getDefaultSettingsByCategory(category: string): DefaultSetting[];
