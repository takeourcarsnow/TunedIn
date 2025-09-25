export {};

declare global {
  interface Window {
    composeCooldown?: { isCooldown: boolean; countdown: string };
    seedDemo?: () => void;
    DB?: any;
    state?: any;
    _tunedinMobileResizeHandler?: boolean;
    _tunedinMobileTabScrollHandler?: boolean;
    ignoreSwipeFromTagCloud?: boolean;
  }
}
