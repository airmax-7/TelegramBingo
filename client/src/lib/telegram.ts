declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready(): void;
        MainButton: {
          hide(): void;
          show(): void;
          setText(text: string): void;
          onClick(callback: () => void): void;
        };
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            is_premium?: boolean;
          };
          auth_date?: number;
          hash?: string;
        };
        showAlert(message: string): void;
        showConfirm(message: string, callback: (confirmed: boolean) => void): void;
        close(): void;
        expand(): void;
        requestContact(callback: (contact: any) => void): void;
      };
    };
  }
}

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export function initTelegramWebApp() {
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
    return true;
  }
  return false;
}

export function getTelegramUser(): TelegramUser | null {
  if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
    return window.Telegram.WebApp.initDataUnsafe.user;
  }
  return null;
}

export function showTelegramAlert(message: string) {
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.showAlert(message);
  } else {
    alert(message);
  }
}

export function showTelegramConfirm(message: string, callback: (confirmed: boolean) => void) {
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.showConfirm(message, callback);
  } else {
    const confirmed = confirm(message);
    callback(confirmed);
  }
}

export function requestTelegramContact(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.requestContact((contact: any) => {
        if (contact && contact.phone_number) {
          resolve(contact.phone_number);
        } else {
          reject(new Error('Phone number not provided'));
        }
      });
    } else {
      reject(new Error('Telegram WebApp not available'));
    }
  });
}

export function closeTelegramApp() {
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.close();
  }
}
