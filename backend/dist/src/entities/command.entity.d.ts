export declare class Command {
    id: string;
    name: string;
    description: string;
    response: string;
    media_url?: string;
    action_type: string;
    action_payload: any;
    active: boolean;
    created_at: Date;
    updated_at: Date;
}
