declare global {
  interface TelegramWebApp {
    ready: () => void;
    expand: () => void;
    disableVerticalSwipes: () => void;
    enableVerticalSwipes: () => void;
    canRequestFullscreen: boolean;
    requestFullscreen: () => void;
    isExpanded: boolean;
    MainButton: {
      show: () => void;
      hide: () => void;
      setParams: (params: { text?: string; color?: string; textColor?: string }) => void;
      onClick: (callback: () => void) => void;
      offClick: () => void;
    };
  }

  interface Window {
    Telegram: {
      WebApp: TelegramWebApp;
    };
  }
}

export {};
