export declare class Broadcast {
    id: string;
    text: string;
    media_urls: string[] | null;
    status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';
    scheduled_at: Date | null;
    started_at: Date | null;
    completed_at: Date | null;
    total_users: number;
    sent_count: number;
    failed_count: number;
    batch_size: number;
    throttle_ms: number;
    created_by_admin_tg_id: string | null;
    created_at: Date;
    updated_at: Date;
}
