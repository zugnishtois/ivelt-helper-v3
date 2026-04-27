import { loadSettings } from './stateManager';
import { applySmartPagination } from './modules/unreadPagination';
import { setupImageResizer } from './modules/imageResizer';
import { setupMediaPlayer } from './modules/mediaPlayer';
import { setupStickyPosts } from './modules/stickyPosts';
import { setupExtraButtons } from './modules/extraButtons';
import { setupGoogleSearch } from './modules/googleSearch';
import { setupKeyboardShortcuts } from './modules/keyboardShortcuts';
import { setupNewResponseNotification } from './modules/newResponseNotification';
import { setupNotificationSplitter } from './modules/notificationSplitter';
import { setupTopicHider } from './modules/topicHider';
import { setupYiddish24Player } from './modules/yiddish24Player';
import { setupCitePopup } from './modules/citePopup';
import { setupWarnOnLosingPost } from './modules/warnOnLosingPost';

async function init() {
  const settings = await loadSettings();
  if (settings.debugMode) console.log('iVelt Pro: Extension initialized.', settings);

  if (settings.smartPagination) applySmartPagination();
  if (settings.autoResizeImages) setupImageResizer();
  if (settings.stickyPosts) setupStickyPosts();
  if (settings.embeddedMedia) setupMediaPlayer();
  if (settings.yiddish24Player) setupYiddish24Player();

  if (settings.mentionButton !== false || settings.quoteOtherTopic !== false) {
    setupExtraButtons(
      settings.mentionButton !== false,
      settings.quoteOtherTopic !== false,
      settings.movableButtonsBar !== false,
      settings.buttonsBarPosition,
    );
  }

  if (settings.googleSearch) setupGoogleSearch();
  if (settings.keyboardShortcuts) setupKeyboardShortcuts();
  if (settings.newResponseNotification) setupNewResponseNotification();
  if (settings.notificationSplitter) setupNotificationSplitter();
  if (settings.topicHider) setupTopicHider();
  if (settings.citePopup) setupCitePopup();
  if (settings.warnOnLosingPost) setupWarnOnLosingPost();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
