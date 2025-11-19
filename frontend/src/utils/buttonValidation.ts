/**
 * Валидация конфигурации кнопок
 */

import { ButtonConfig, ButtonValidationError, SubButton, Section } from '../types/button.types';

export function validateButtonConfig(config: ButtonConfig): ButtonValidationError[] {
  const errors: ButtonValidationError[] = [];

  // Валидация label
  if (!config.label || config.label.trim().length === 0) {
    errors.push({ field: 'label', message: 'Название кнопки обязательно' });
  } else if (config.label.length > 64) {
    errors.push({ field: 'label', message: 'Название кнопки не должно превышать 64 символа' });
  }

  // Валидация callback_data
  if (config.callback_data) {
    const callbackDataBytes = new TextEncoder().encode(config.callback_data).length;
    if (callbackDataBytes > 64) {
      errors.push({ field: 'callback_data', message: 'callback_data не должен превышать 64 байта' });
    }
  }

  // Валидация URL
  if (config.mode === 'url' && config.payload) {
    try {
      const url = new URL(config.payload);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push({ field: 'payload', message: 'URL должен использовать протокол http или https' });
      }
    } catch {
      errors.push({ field: 'payload', message: 'Неверный формат URL' });
    }
  }

  // Валидация медиа
  if (config.mode === 'media' && config.media) {
    if (!config.media.type) {
      errors.push({ field: 'media', message: 'Тип медиа обязателен' });
    }
    if (!config.media.url && !config.media.media_id && !config.media.file) {
      errors.push({ field: 'media', message: 'Необходимо указать URL, media_id или загрузить файл' });
    }
  }

  // Валидация функции
  if (config.mode === 'function' && config.function) {
    if (config.function.type === 'webhook' && !config.function.url) {
      errors.push({ field: 'function', message: 'URL webhook обязателен' });
    }
    if (config.function.type === 'script' && !config.function.script) {
      errors.push({ field: 'function', message: 'Скрипт обязателен' });
    }
    if (config.function.type === 'internal' && !config.function.function_name) {
      errors.push({ field: 'function', message: 'Имя функции обязательно' });
    }
  }

  // Валидация разделов и подкнопок
  if (config.mode === 'submenu' && config.sections) {
    config.sections.forEach((section, sectionIndex) => {
      if (!section.title || section.title.trim().length === 0) {
        errors.push({ field: `sections[${sectionIndex}].title`, message: 'Название раздела обязательно' });
      }

      section.subbuttons.forEach((subButton, buttonIndex) => {
        const subErrors = validateSubButton(subButton, `sections[${sectionIndex}].subbuttons[${buttonIndex}]`);
        errors.push(...subErrors);
      });
    });
  }

  return errors;
}

export function validateSubButton(subButton: SubButton, prefix: string = ''): ButtonValidationError[] {
  const errors: ButtonValidationError[] = [];

  if (!subButton.label || subButton.label.trim().length === 0) {
    errors.push({ field: `${prefix}.label`, message: 'Название подкнопки обязательно' });
  } else if (subButton.label.length > 64) {
    errors.push({ field: `${prefix}.label`, message: 'Название подкнопки не должно превышать 64 символа' });
  }

  if (subButton.callback_data) {
    const callbackDataBytes = new TextEncoder().encode(subButton.callback_data).length;
    if (callbackDataBytes > 64) {
      errors.push({ field: `${prefix}.callback_data`, message: 'callback_data не должен превышать 64 байта' });
    }
  }

  if (subButton.mode === 'url' && subButton.payload) {
    try {
      const url = new URL(subButton.payload);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push({ field: `${prefix}.payload`, message: 'URL должен использовать протокол http или https' });
      }
    } catch {
      errors.push({ field: `${prefix}.payload`, message: 'Неверный формат URL' });
    }
  }

  return errors;
}

export function validateCallbackDataUniqueness(
  config: ButtonConfig,
  existingConfigs: ButtonConfig[]
): ButtonValidationError[] {
  const errors: ButtonValidationError[] = [];

  if (!config.callback_data) return errors;

  const duplicate = existingConfigs.find(
    (c) => c.id !== config.id && c.callback_data === config.callback_data
  );

  if (duplicate) {
    errors.push({
      field: 'callback_data',
      message: `callback_data "${config.callback_data}" уже используется в кнопке "${duplicate.label}"`,
    });
  }

  // Проверка уникальности в подкнопках
  if (config.sections) {
    const allCallbackData: string[] = [];
    config.sections.forEach((section) => {
      section.subbuttons.forEach((subButton) => {
        if (subButton.callback_data) {
          if (allCallbackData.includes(subButton.callback_data)) {
            errors.push({
              field: 'sections',
              message: `callback_data "${subButton.callback_data}" дублируется в подкнопках`,
            });
          }
          allCallbackData.push(subButton.callback_data);
        }
      });
    });
  }

  return errors;
}

