// src/renderer/src/utils/notifications.ts

import { toast } from 'sonner';

export interface NotificationOptions {
  title?: string;
  description?: string;
  duration?: number;
  actionLabel?: string;
  action?: () => void;
}

export const showSuccessNotification = (
  message: string,
  options?: NotificationOptions
) => {
  toast.success(options?.title || message, {
    description: options?.description,
    duration: options?.duration || 4000,
    action: options?.action ? {
      label: options.actionLabel || 'Action',
      onClick: options.action
    } : undefined
  });
};

export const showErrorNotification = (
  message: string,
  options?: NotificationOptions
) => {
  toast.error(options?.title || message, {
    description: options?.description,
    duration: options?.duration || 6000,
    action: options?.action ? {
      label: options.actionLabel || 'Retry',
      onClick: options.action
    } : undefined
  });
};

export const showWarningNotification = (
  message: string,
  options?: NotificationOptions
) => {
  toast.warning(options?.title || message, {
    description: options?.description,
    duration: options?.duration || 5000,
    action: options?.action ? {
      label: options.actionLabel || 'Action',
      onClick: options.action
    } : undefined
  });
};

export const showInfoNotification = (
  message: string,
  options?: NotificationOptions
) => {
  toast.info(options?.title || message, {
    description: options?.description,
    duration: options?.duration || 4000,
    action: options?.action ? {
      label: options.actionLabel || 'Action',
      onClick: options.action
    } : undefined
  });
};

export const showLoadingNotification = (
  message: string,
  options?: { description?: string }
) => {
  return toast.loading(message, {
    description: options?.description
  });
};

export const dismissNotification = (toastId: string | number) => {
  toast.dismiss(toastId);
};