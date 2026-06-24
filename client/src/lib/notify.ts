// Native OS notifications (Telegram-style). In the Electron desktop shell these
// render as real system toasts even when the window is hidden in the tray; in a
// browser/PWA they use the standard Notification API. Either way we only fire
// them when the app isn't in the foreground, so active users aren't spammed.

declare global {
  interface Window {
    murmurDesktop?: { isDesktop: boolean; platform: string; focus?: () => void };
  }
}

let permissionAsked = false;

export function requestNotifyPermission() {
  if (permissionAsked) return;
  permissionAsked = true;
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  } catch {
    /* Notification API unavailable */
  }
}

// True when the window is in the foreground (don't notify in that case).
function appInForeground() {
  return document.visibilityState === 'visible' && document.hasFocus();
}

interface NativeNotice {
  title: string;
  body?: string;
  icon?: string | null;
  /** SPA path to open when the notification is clicked. */
  navigateTo?: string;
  /** Notifications sharing a tag replace each other instead of stacking. */
  tag?: string;
}

export function showNativeNotification({ title, body, icon, navigateTo, tag }: NativeNotice) {
  try {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    if (appInForeground()) return;

    const notification = new Notification(title, {
      body: body || undefined,
      icon: icon || undefined,
      tag,
    });

    notification.onclick = () => {
      // Bring the desktop window back from the tray (or focus the browser tab).
      if (window.murmurDesktop?.focus) window.murmurDesktop.focus();
      else window.focus();
      if (navigateTo) {
        window.dispatchEvent(new CustomEvent('murmur:navigate', { detail: navigateTo }));
      }
      notification.close();
    };
  } catch {
    /* ignore notification failures */
  }
}
