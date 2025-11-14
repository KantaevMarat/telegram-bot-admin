import { User } from './user.entity';
export declare enum PaymentMethod {
    USD_BALANCE = "usd_balance",
    RUB_REQUISITES = "rub_requisites",
    UAH_REQUISITES = "uah_requisites"
}
export declare enum RequestStatus {
    NEW = "new",
    IN_PROGRESS = "in_progress",
    REQUISITES_SENT = "requisites_sent",
    PAYMENT_CONFIRMED = "payment_confirmed",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}
export declare class PremiumRequest {
    id: string;
    request_number: string;
    user_id: string;
    user: User;
    payment_method: PaymentMethod;
    amount: number;
    currency: string;
    status: RequestStatus;
    admin_notes: string;
    processed_by_admin: string;
    requisites_sent_at: Date;
    payment_confirmed_at: Date;
    completed_at: Date;
    created_at: Date;
    updated_at: Date;
}
