"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddCommandActionTypeFields1763382000000 = void 0;
class AddCommandActionTypeFields1763382000000 {
    async up(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE commands
            ADD COLUMN IF NOT EXISTS action_type VARCHAR DEFAULT 'text',
            ADD COLUMN IF NOT EXISTS action_payload JSONB
        `);
        await queryRunner.query(`
            UPDATE commands
            SET 
                action_type = CASE 
                    WHEN media_url IS NOT NULL AND media_url != '' THEN 'media'
                    ELSE 'text'
                END,
                action_payload = CASE 
                    WHEN media_url IS NOT NULL AND media_url != '' THEN 
                        jsonb_build_object(
                            'text', COALESCE(response, ''),
                            'media_url', media_url,
                            'media_type', CASE 
                                WHEN media_url LIKE '%.jpg' OR media_url LIKE '%.jpeg' OR media_url LIKE '%.png' OR media_url LIKE '%.gif' THEN 'photo'
                                WHEN media_url LIKE '%.mp4' OR media_url LIKE '%.avi' OR media_url LIKE '%.mov' THEN 'video'
                                ELSE 'photo'
                            END
                        )
                    ELSE 
                        jsonb_build_object('text', COALESCE(response, ''))
                END
            WHERE action_type IS NULL OR action_payload IS NULL
        `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE commands
            DROP COLUMN IF EXISTS action_type,
            DROP COLUMN IF EXISTS action_payload
        `);
    }
}
exports.AddCommandActionTypeFields1763382000000 = AddCommandActionTypeFields1763382000000;
//# sourceMappingURL=1763382000000-AddCommandActionTypeFields.js.map