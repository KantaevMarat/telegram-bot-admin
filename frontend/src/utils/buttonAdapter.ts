/**
 * Адаптер для преобразования между старой и новой структурой кнопок
 */

import { ButtonConfig } from '../types/button.types';

// Старая структура из backend
interface OldButton {
  id: string;
  label: string;
  action_type: string;
  action_payload: any;
  media_url?: string;
  command?: string;
  row: number;
  col: number;
  active: boolean;
}

/**
 * Преобразование старой структуры в новую
 */
export function oldButtonToNewConfig(oldButton: OldButton): ButtonConfig {
  const config: ButtonConfig = {
    id: oldButton.id,
    label: oldButton.label || '',
    mode: mapActionTypeToMode(oldButton.action_type),
    visibility: 'both',
    permissions: ['all'],
    active: oldButton.active,
  };

  // Извлекаем дополнительные поля из action_payload
  if (oldButton.action_payload && typeof oldButton.action_payload === 'object') {
    if (oldButton.action_payload.icon) {
      config.icon = oldButton.action_payload.icon;
    }
    // Цвет не используется в Telegram Bot API, но сохраняем для совместимости
    // if (oldButton.action_payload.color) {
    //   config.color = oldButton.action_payload.color;
    // }
    if (oldButton.action_payload.callback_data) {
      config.callback_data = oldButton.action_payload.callback_data;
    }
  }

  // Обработка action_payload
  if (oldButton.action_payload) {
    if (typeof oldButton.action_payload === 'string') {
      config.payload = oldButton.action_payload;
    } else if (typeof oldButton.action_payload === 'object') {
      // Проверяем, есть ли данные функции (script, webhook, function_name)
      if (oldButton.action_payload.script || oldButton.action_payload.webhook_url || oldButton.action_payload.function_name) {
        // Это режим function
        config.mode = 'function';
        config.function = {
          type: oldButton.action_payload.script ? 'script' : 
                oldButton.action_payload.webhook_url ? 'webhook' : 
                'internal',
          script: oldButton.action_payload.script,
          url: oldButton.action_payload.webhook_url,
          function_name: oldButton.action_payload.function_name,
          timeout: oldButton.action_payload.timeout || 30,
        };
        config.payload = oldButton.action_payload.script || oldButton.action_payload.webhook_url || oldButton.action_payload.function_name || '';
      } else if (oldButton.action_payload.url) {
        config.mode = 'url';
        config.payload = oldButton.action_payload.url;
      } else if (oldButton.action_payload.text) {
        config.mode = 'text';
        config.payload =
          typeof oldButton.action_payload.text === 'string'
            ? oldButton.action_payload.text
            : oldButton.action_payload.text?.text || '';
      } else if (oldButton.action_payload.inline_buttons) {
        // Это inline кнопки - преобразуем в submenu
        config.mode = 'submenu';
        config.sections = [
          {
            id: `sec_${oldButton.id}`,
            title: 'Раздел 1',
            subbuttons: oldButton.action_payload.inline_buttons.map((btn: any, index: number) => ({
              id: `btn_${oldButton.id}_${index}`,
              label: btn.text || '',
              mode: btn.url ? 'url' : 'command',
              payload: btn.url || btn.callback_data || '',
              callback_data: btn.callback_data,
            })),
          },
        ];
      }
    }
  }

  // Обработка команды (только если режим еще не установлен как function)
  if (oldButton.command && config.mode !== 'function') {
    config.mode = 'command';
    config.payload = oldButton.command;
  }

  // Обработка медиа
  if (oldButton.media_url) {
    config.media = {
      type: 'photo',
      url: oldButton.media_url,
    };
  }

  return config;
}

/**
 * Преобразование новой структуры в старую для отправки на backend
 */
export function newConfigToOldButton(config: ButtonConfig, isUpdate: boolean = false): Partial<OldButton> {
  const oldButton: Partial<OldButton> = {
    label: config.label,
    action_type: mapModeToActionType(config.mode),
    row: 1,
    col: 1,
    active: config.active !== false,
  };

  // Сохраняем дополнительные поля в action_payload для совместимости
  // (пока backend не поддерживает отдельные поля для icon, color и т.д.)
  if (!oldButton.action_payload || typeof oldButton.action_payload !== 'object') {
    oldButton.action_payload = {};
  }
  
  // Если action_payload уже объект, добавляем метаданные
  if (typeof oldButton.action_payload === 'object' && oldButton.action_payload !== null) {
    if (config.icon) {
      oldButton.action_payload.icon = config.icon;
    }
    // Цвет не используется в Telegram Bot API, убираем сохранение
    // if (config.color) {
    //   oldButton.action_payload.color = config.color;
    // }
    if (config.callback_data) {
      oldButton.action_payload.callback_data = config.callback_data;
    }
  }

  // ID передаем только при обновлении (при создании backend сам сгенерирует UUID)
  if (isUpdate && config.id) {
    // Проверяем, что ID является UUID (формат: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(config.id)) {
      // ID уже UUID, можно использовать
    } else {
      // ID не UUID - не передаем, backend вернет ошибку или создаст новый
      console.warn('Button ID is not a valid UUID, backend will generate a new one');
    }
  }

  // Обработка payload в зависимости от режима
  // Важно: сохраняем метаданные (icon, color, callback_data) в action_payload
  if (config.mode === 'command' && config.payload) {
    oldButton.command = config.payload;
    oldButton.action_payload = {
      ...oldButton.action_payload,
      command: config.payload,
    };
  } else if (config.mode === 'text' && config.payload) {
    oldButton.action_payload = {
      ...oldButton.action_payload,
      text: { text: config.payload },
    };
  } else if (config.mode === 'url' && config.payload) {
    oldButton.action_payload = {
      ...oldButton.action_payload,
      url: config.payload,
    };
  } else if (config.mode === 'media' && config.media) {
    oldButton.media_url = config.media.url || config.media.media_id;
    oldButton.action_payload = {
      ...oldButton.action_payload,
      text: config.media.caption || '',
    };
  } else if (config.mode === 'function' && config.function) {
    // Сохраняем данные функции в action_payload
    oldButton.action_payload = {
      ...oldButton.action_payload,
    };
    if (config.function.type === 'script' && config.function.script) {
      oldButton.action_payload.script = config.function.script;
      oldButton.action_payload.timeout = config.function.timeout || 30;
    } else if (config.function.type === 'webhook' && config.function.url) {
      oldButton.action_payload.webhook_url = config.function.url;
      oldButton.action_payload.timeout = config.function.timeout || 30;
    } else if (config.function.type === 'internal' && config.function.function_name) {
      oldButton.action_payload.function_name = config.function.function_name;
    }
  } else if (config.mode === 'submenu' && config.sections) {
    // Преобразуем submenu в inline_buttons
    const inlineButtons: any[] = [];
    config.sections.forEach((section) => {
      section.subbuttons.forEach((subButton) => {
        if (subButton.mode === 'url' && subButton.payload) {
          inlineButtons.push({
            text: subButton.label,
            url: subButton.payload,
          });
        } else {
          inlineButtons.push({
            text: subButton.label,
            callback_data: subButton.callback_data || subButton.id,
          });
        }
      });
    });
    oldButton.action_payload = {
      ...oldButton.action_payload,
      text: config.label,
      inline_buttons: inlineButtons,
    };
  }

  // Убеждаемся, что метаданные сохранены (они могли быть перезаписаны выше)
  if (config.icon) {
    oldButton.action_payload = {
      ...oldButton.action_payload,
      icon: config.icon,
    };
  }
  // Цвет не используется в Telegram Bot API, убираем сохранение
  // if (config.color) {
  //   oldButton.action_payload = {
  //     ...oldButton.action_payload,
  //     color: config.color,
  //   };
  // }
  if (config.callback_data) {
    oldButton.action_payload = {
      ...oldButton.action_payload,
      callback_data: config.callback_data,
    };
  }

  return oldButton;
}

function mapActionTypeToMode(actionType: string): ButtonConfig['mode'] {
  const mapping: Record<string, ButtonConfig['mode']> = {
    command: 'command',
    text: 'text',
    message: 'text',
    url: 'url',
    media: 'media',
    scenario: 'function',
  };
  return mapping[actionType] || 'text';
}

function mapModeToActionType(mode: ButtonConfig['mode']): string {
  const mapping: Record<ButtonConfig['mode'], string> = {
    command: 'command',
    text: 'text',
    media: 'media',
    url: 'url',
    function: 'scenario',
    submenu: 'text', // submenu преобразуется в text с inline_buttons
  };
  return mapping[mode] || 'text';
}

