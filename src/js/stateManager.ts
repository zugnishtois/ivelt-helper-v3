export interface CustomLink {
  name: string;
  url: string;
}

export type Corner = 'tl' | 'tr' | 'bl' | 'br';

export interface ButtonsBarPosition {
  // Free-drag position offsets relative to .postbody (top-left origin).
  // Stored as percentages so it scales with post sizes.
  xPct: number;
  yPct: number;
}

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
  debugMode: boolean;            // verbose logging
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
  debugMode: false,
  backgroundSyncPosts: 60000,
  backgroundSyncNotif: 1,

  buttonsBarPosition: null,
};

export async function loadSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get('iveltSettings', (data) => {
      if (data.iveltSettings) {
        resolve({ ...defaultSettings, ...data.iveltSettings });
      } else {
        resolve(defaultSettings);
      }
    });
  });
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  const currentSettings = await loadSettings();
  const newSettings = { ...currentSettings, ...settings };
  return new Promise((resolve) => {
    chrome.storage.sync.set({ iveltSettings: newSettings }, () => {
      resolve();
    });
  });
}
