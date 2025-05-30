import { useState, useEffect } from 'react';
import { initTelegramWebApp, getTelegramUser, type TelegramUser } from '@/lib/telegram';

export function useTelegram() {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<TelegramUser | null>(null);

  useEffect(() => {
    const init = () => {
      const ready = initTelegramWebApp();
      setIsReady(ready);
      
      if (ready) {
        const telegramUser = getTelegramUser();
        setUser(telegramUser);
      }
    };

    // Check if script is already loaded
    if (window.Telegram?.WebApp) {
      init();
    } else {
      // Wait for script to load
      const checkTelegram = setInterval(() => {
        if (window.Telegram?.WebApp) {
          clearInterval(checkTelegram);
          init();
        }
      }, 100);

      // Cleanup after 5 seconds
      setTimeout(() => {
        clearInterval(checkTelegram);
        if (!isReady) {
          // Fallback for development/testing
          setIsReady(true);
        }
      }, 5000);
    }
  }, []);

  return { isReady, user };
}
