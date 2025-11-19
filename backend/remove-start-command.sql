-- Remove /start command from database if it exists
-- This ensures that /start is always handled as a built-in command

DELETE FROM commands WHERE name = 'start' OR name = '/start';

-- Also remove other built-in commands if they exist
DELETE FROM commands WHERE action_type = 'built_in';

