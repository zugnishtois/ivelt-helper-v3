export interface CustomLink {
  name: string;
  url: string;
}

// 6 anchor points the post-buttons bar can snap to:
// tl=top-left, tc=top-center, tr=top-right,
// bl=bottom-left, bc=bottom-center, br=bottom-right
export type ButtonsBarAnchor = 'tl' | 'tc' | 'tr' | 'bl' | 'bc' | 'br';

export type ButtonsBarPosition = ButtonsBarAnchor;

export interface ExtensionSettings {
  smartPagination: boolean;
  autoResizeImages: boolean;
  stickyPosts: boolean;
  embeddedMedia: boolean;
  yiddish24Player: boolean;
  mentionButton: boolean;
  quoteOtherTopic: boolean;
  keyboardShortcuts: boolean;
  citeInOtherTopic: boolean;     // ציטיר אין אנדערע אשכול (full BBCode quote + url)
  citeLastQuote: boolean;        // ציטיר לעצטע (strip nested quotes)
  newResponseNotification: boolean;
  notificationSplitter: boolean;
  googleSearch: boolean;
  topicHider: boolean;
  pushNotifications: boolean;
  customLinks: CustomLink[];

  // New / ported options
  citePopup: boolean;            // floating "ציטיר" on text selection
  movableButtonsBar: boolean;    // free-drag post button bar
  warnOnLosingPost: boolean;     // warn before losing unsent post
  alwaysCopyTopic: boolean;      // copy quoted text instead of inserting
  copyAttachments: boolean;      // include attachments when copying
  backgroundSyncPosts: number;   // ms; 0 = off
  backgroundSyncNotif: number;   // minutes; 0 = off

  // Persisted free-drag position for the post button bar (global)
  buttonsBarPosition: ButtonsBarPosition | null;
}

export const defaultSettings: ExtensionSettings = {
  smartPagination: true,
  autoResizeImages: true,
  stickyPosts: true,
  embeddedMedia: true,
  yiddish24Player: true,
  mentionButton: true,
  quoteOtherTopic: true,
  keyboardShortcuts: true,
  citeInOtherTopic: true,
  citeLastQuote: true,
  newResponseNotification: true,
  notificationSplitter: true,
  googleSearch: true,
  topicHider: true,
  pushNotifications: true,
  customLinks: [],

  citePopup: true,
  movableButtonsBar: true,
  warnOnLosingPost: true,
  alwaysCopyTopic: false,
  copyAttachments: false,
  backgroundSyncPosts: 60000,
  backgroundSyncNotif: 1,

  buttonsBarPosition: null,
};

// `chrome.runtime.id` is undefined when the extension has been reloaded but the
// page still has stale references — calling chrome.storage.* in that state throws
// "Extension context invalidated". Guard every call.
function isContextValid(): boolean {
  try {
    return !!chrome?.runtime?.id;
  } catch {
    return false;
  }
}

export async function loadSettings(): Promise<ExtensionSettings> {
  if (!isContextValid()) return defaultSettings;
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get('iveltSettings', (data) => {
        if (chrome.runtime.lastError) {
          resolve(defaultSettings);
          return;
        }
        if (data.iveltSettings) {
          resolve({ ...defaultSettings, ...data.iveltSettings });
        } else {
          resolve(defaultSettings);
        }
      });
    } catch {
      resolve(defaultSettings);
    }
  });
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  if (!isContextValid()) return;
  const currentSettings = await loadSettings();
  const newSettings = { ...currentSettings, ...settings };
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.set({ iveltSettings: newSettings }, () => {
        // Swallow lastError so the page never throws on a stale context.
        void chrome.runtime.lastError;
        resolve();
      });
    } catch {
      resolve();
    }
  });
}
