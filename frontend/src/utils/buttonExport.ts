/**
 * Экспорт и импорт конфигурации кнопок в JSON
 */

import { ButtonConfig, Section, SubButton } from '../types/button.types';

/**
 * Экспорт конфигурации кнопки в JSON по схеме
 */
export function exportButtonToJSON(config: ButtonConfig): string {
  const json: any = {
    id: config.id,
    label: config.label,
    icon: config.icon,
    color: config.color,
    visibility: config.visibility,
    permissions: config.permissions,
    mode: config.mode,
  };

  // Добавляем callback_data если есть
  if (config.callback_data) {
    json.callback_data = config.callback_data;
  }

  // Добавляем payload в зависимости от режима
  if (config.mode === 'command' && config.payload) {
    json.payload = config.payload;
  } else if (config.mode === 'text' && config.payload) {
    json.payload = config.payload;
  } else if (config.mode === 'url' && config.payload) {
    json.payload = config.payload;
  }

  // Добавляем медиа
  if (config.mode === 'media' && config.media) {
    json.media = {
      type: config.media.type,
      media_id: config.media.media_id,
      url: config.media.url,
      caption: config.media.caption,
    };
  }

  // Добавляем функцию
  if (config.mode === 'function' && config.function) {
    json.function = {
      type: config.function.type,
      url: config.function.url,
      script: config.function.script,
      function_name: config.function.function_name,
      timeout: config.function.timeout,
      whitelist: config.function.whitelist,
    };
  }

  // Добавляем разделы для submenu
  if (config.mode === 'submenu' && config.sections) {
    json.sections = config.sections.map((section) => ({
      id: section.id,
      title: section.title,
      subbuttons: section.subbuttons.map((subButton) => {
        const subButtonJson: any = {
          id: subButton.id,
          label: subButton.label,
          icon: subButton.icon,
          color: subButton.color,
          mode: subButton.mode,
        };

        if (subButton.callback_data) {
          subButtonJson.callback_data = subButton.callback_data;
        }

        if (subButton.mode === 'command' && subButton.payload) {
          subButtonJson.payload = subButton.payload;
        } else if (subButton.mode === 'text' && subButton.payload) {
          subButtonJson.payload = subButton.payload;
        } else if (subButton.mode === 'url' && subButton.payload) {
          subButtonJson.payload = subButton.payload;
        }

        if (subButton.mode === 'media' && subButton.media) {
          subButtonJson.media = {
            type: subButton.media.type,
            media_id: subButton.media.media_id,
            url: subButton.media.url,
            caption: subButton.media.caption,
          };
        }

        if (subButton.mode === 'function' && subButton.function) {
          subButtonJson.function = {
            type: subButton.function.type,
            url: subButton.function.url,
            script: subButton.function.script,
            function_name: subButton.function.function_name,
          };
        }

        if (subButton.permissions) {
          subButtonJson.permissions = subButton.permissions;
        }

        if (subButton.visibility) {
          subButtonJson.visibility = subButton.visibility;
        }

        return subButtonJson;
      }),
    }));
  }

  // Добавляем расписание
  if (config.schedule?.enabled) {
    json.schedule = config.schedule;
  }

  // Добавляем подтверждение
  if (config.confirm_before_action) {
    json.confirm_before_action = true;
  }

  return JSON.stringify(json, null, 2);
}

/**
 * Импорт конфигурации кнопки из JSON
 */
export function importButtonFromJSON(jsonString: string): ButtonConfig | null {
  try {
    const json = JSON.parse(jsonString);

    const config: ButtonConfig = {
      id: json.id || `btn_${Date.now()}`,
      label: json.label || '',
      icon: json.icon,
      color: json.color,
      visibility: json.visibility || 'both',
      permissions: json.permissions || ['all'],
      mode: json.mode || 'text',
      callback_data: json.callback_data,
      payload: json.payload,
    };

    // Импорт медиа
    if (json.media) {
      config.media = {
        type: json.media.type,
        media_id: json.media.media_id,
        url: json.media.url,
        caption: json.media.caption,
      };
    }

    // Импорт функции
    if (json.function) {
      config.function = {
        type: json.function.type,
        url: json.function.url,
        script: json.function.script,
        function_name: json.function.function_name,
        timeout: json.function.timeout,
        whitelist: json.function.whitelist,
      };
    }

    // Импорт разделов
    if (json.sections && Array.isArray(json.sections)) {
      config.sections = json.sections.map((section: any) => ({
        id: section.id || `sec_${Date.now()}_${Math.random()}`,
        title: section.title || '',
        subbuttons: (section.subbuttons || []).map((subButton: any) => {
          const subButtonConfig: SubButton = {
            id: subButton.id || `btn_${Date.now()}_${Math.random()}`,
            label: subButton.label || '',
            icon: subButton.icon,
            color: subButton.color,
            mode: subButton.mode || 'text',
            callback_data: subButton.callback_data,
            payload: subButton.payload,
            permissions: subButton.permissions,
            visibility: subButton.visibility,
          };

          if (subButton.media) {
            subButtonConfig.media = {
              type: subButton.media.type,
              media_id: subButton.media.media_id,
              url: subButton.media.url,
              caption: subButton.media.caption,
            };
          }

          if (subButton.function) {
            subButtonConfig.function = {
              type: subButton.function.type,
              url: subButton.function.url,
              script: subButton.function.script,
              function_name: subButton.function.function_name,
            };
          }

          return subButtonConfig;
        }),
      }));
    }

    // Импорт расписания
    if (json.schedule) {
      config.schedule = json.schedule;
    }

    // Импорт подтверждения
    if (json.confirm_before_action) {
      config.confirm_before_action = true;
    }

    return config;
  } catch (error) {
    console.error('Ошибка импорта JSON:', error);
    return null;
  }
}

/**
 * Скачать JSON файл
 */
export function downloadJSON(jsonString: string, filename: string = 'button-config.json') {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

