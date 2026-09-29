import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  StatusBar,
  View,
  Text,
  TouchableOpacity,
  BackHandler,
  Platform,
  ActivityIndicator,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

// Injected JavaScript Engine for Anchor
const INJECTED_JAVASCRIPT = `
(function() {
  if (window.__ANCHOR_INITIALIZED__) {
    return;
  }
  window.__ANCHOR_INITIALIZED__ = true;

  // 1. Dynamic CSS Shield: Injected into <head> for zero-flicker distraction removal
  const shieldStyle = document.createElement('style');
  shieldStyle.id = 'anchor-shield-style';
  shieldStyle.innerHTML = \`
    /* Hide Reels & Explore navigation everywhere */
    a[href*="/reels/"],
    a[href*="/explore/"],
    a[aria-label*="Reels" i],
    a[aria-label*="Explore" i],
    svg[aria-label*="Reels" i],
    svg[aria-label*="Explore" i],
    div[data-testid="reels-tab"],
    div[data-testid="explore-tab"],

    /* Hide Home Feed buttons to prevent landing on algorithmic feed */
    a[href="/"] svg[aria-label*="Home" i],
    a[href="/"][role="link"],
    svg[aria-label="Home" i],

    /* Hide Instagram's built-in web bottom navigation bar (Anchor provides its own native bar) */
    div[role="tablist"],
    div > nav[style*="bottom: 0"],
    div > nav[style*="bottom:0"],
    header + div nav,
    div[style*="position: fixed"][style*="bottom: 0px"],
    div[style*="position: fixed"][style*="bottom:0px"],

    /* Hide algorithmic suggested accounts and external recommendation units */
    div[data-testid="suggested_users_feed_unit"],

    /* Anchor Floating Overlay button for DM-shared Reels */
    #anchor-reel-overlay-btn {
      position: fixed;
      top: 14px;
      left: 14px;
      z-index: 2147483647;
      background: rgba(0, 0, 0, 0.88);
      color: #ffffff;
      padding: 10px 18px;
      border-radius: 24px;
      font-size: 13px;
      font-weight: 700;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.28);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }
  \`;
  (document.head || document.documentElement).appendChild(shieldStyle);

  // Helper to notify native app
  function sendToNative(data) {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify(data));
    }
  }

  // 2. Detection of User Profile URL
  function detectUserProfile() {
    try {
      // Check header text or elements for username (e.g. "jack_98472 ∨")
      const headerTitle = document.querySelector('header h2, header h1, header button span, div[role="main"] header h2');
      if (headerTitle && headerTitle.innerText) {
        const cleanName = headerTitle.innerText.split('\\n')[0].replace('∨', '').trim();
        if (cleanName && !cleanName.includes(' ') && cleanName.length > 2) {
          window.__ANCHOR_USERNAME__ = cleanName;
          sendToNative({ type: 'PROFILE_DETECTED', username: cleanName, url: 'https://www.instagram.com/' + cleanName + '/' });
          return;
        }
      }

      // Find profile link from DOM (avatar or profile icon)
      const profileLink =
        document.querySelector('a[href^="/"][role="link"] img[alt*="profile picture" i]')?.closest('a') ||
        document.querySelector('a[href^="/"][aria-label*="Profile" i]') ||
        document.querySelector('a[href^="/"][role="link"][href$="/"] img')?.closest('a');

      if (profileLink && profileLink.href) {
        const url = new URL(profileLink.href);
        const pathParts = url.pathname.split('/').filter(Boolean);
        // Exclude system paths
        const ignoredPaths = ['direct', 'explore', 'reels', 'accounts', 'stories', 'legal', 'privacy'];
        if (pathParts.length === 1 && !ignoredPaths.includes(pathParts[0].toLowerCase())) {
          window.__ANCHOR_USERNAME__ = pathParts[0];
          sendToNative({ type: 'PROFILE_DETECTED', username: pathParts[0], url: profileLink.href });
        }
      }
    } catch (e) {}
  }

  // 3. Continuously hide any fixed bottom navigation from Instagram web (preserves chat inputs)
  function hideInstagramBottomNavs() {
    try {
      document.querySelectorAll('div, nav, footer').forEach(function(el) {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' || style.position === 'sticky') {
          const rect = el.getBoundingClientRect();
          if (rect.bottom >= window.innerHeight - 15 && rect.height > 25 && rect.height < 85) {
            const hasInput = el.querySelector('input, textarea, [contenteditable="true"]');
            if (!hasInput) {
              el.style.setProperty('display', 'none', 'important');
            }
          }
        }
      });
    } catch(e) {}
  }

  // 3. Strict DM Reel Isolation: Lock swipe navigation
  let touchStartY = 0;
  function handleTouchStart(e) {
    if (e.touches && e.touches[0]) {
      touchStartY = e.touches[0].clientY;
    }
  }

  function handleTouchMove(e) {
    const path = window.location.pathname;
    const isReelPage = path.startsWith('/reel/') || path.startsWith('/reels/');
    if (isReelPage && e.touches && e.touches[0]) {
      const deltaY = e.touches[0].clientY - touchStartY;
      // If user is swiping vertically (attempting to trigger next reel)
      if (Math.abs(deltaY) > 30) {
        e.preventDefault(); // Lock the reel from scrolling to infinite feed
      }
    }
  }

  window.addEventListener('touchstart', handleTouchStart, { passive: true });
  window.addEventListener('touchmove', handleTouchMove, { passive: false });

  // 4. Distraction Engine & Route Interceptor
  function enforceAnchorRules() {
    const path = window.location.pathname;

    // Do NOT intercept authentication, login, 2FA, signup
    const isAuth =
      path.includes('/accounts/login') ||
      path.includes('/accounts/emailsignup') ||
      path.includes('/accounts/password') ||
      path.includes('/challenge') ||
      path.includes('/two_factor') ||
      path.includes('/privacy/');

    if (isAuth) {
      sendToNative({ type: 'AUTH_STATE', isAuth: true });
      return;
    }
    sendToNative({ type: 'AUTH_STATE', isAuth: false });

    // A. Intercept Root Home & General Explore/Reels
    if (path === '/' || path === '/#' || path === '' || path.startsWith('/explore/') || path === '/reels' || path === '/reels/') {
      window.location.replace('https://www.instagram.com/direct/inbox/');
      sendToNative({ type: 'BLOCKED_FEED', path: path });
      return;
    }

    // B. Hide Navigation Entry Points for Explore & Reels
    const selectors = [
      'a[href*="/reels/"]',
      'a[href*="/explore/"]',
      'a[aria-label*="Reels" i]',
      'a[aria-label*="Explore" i]',
      'svg[aria-label*="Reels" i]',
      'svg[aria-label*="Explore" i]',
      'a[href="/"]',
      'svg[aria-label="Home" i]'
    ];

    selectors.forEach(function(sel) {
      document.querySelectorAll(sel).forEach(function(el) {
        const target = el.closest('a') || el;
        if (target && target.style.display !== 'none') {
          target.style.display = 'none';
        }
      });
    });

    // C. Handle DM-Shared Reel/Post Isolation
    const isSharedContent = path.startsWith('/reel/') || path.startsWith('/p/');
    const existingBtn = document.getElementById('anchor-reel-overlay-btn');

    if (isSharedContent) {
      if (!existingBtn) {
        const btn = document.createElement('button');
        btn.id = 'anchor-reel-overlay-btn';
        btn.innerHTML = '⚓ Back to Messages';
        btn.onclick = function(e) {
          e.preventDefault();
          e.stopPropagation();
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.replace('https://www.instagram.com/direct/inbox/');
          }
        };
        document.body.appendChild(btn);
      }
    } else {
      if (existingBtn) {
        existingBtn.remove();
      }
    }

    // Detect user profile
    detectUserProfile();

    // Hide any duplicate bottom bars from Instagram web
    hideInstagramBottomNavs();
  }

  // Initial execution & polling interval
  enforceAnchorRules();
  setInterval(enforceAnchorRules, 600);

  // Real-time DOM observer for dynamic SPAs
  const observer = new MutationObserver(enforceAnchorRules);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  window.addEventListener('popstate', enforceAnchorRules);
})();
true;
`;

export default function App() {
  return (
    <SafeAreaProvider>
      <AnchorApp />
    </SafeAreaProvider>
  );
}

function AnchorApp() {
  const insets = useSafeAreaInsets();
  // Safe top padding that accounts for Android status bar (including notch / hole punch) or iOS notch
  const safeTop = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0
  );
  // Safe bottom padding for Android gesture bar and iOS home indicator
  const safeBottom = Math.max(insets.bottom, Platform.OS === 'ios' ? 14 : 8);

  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [activeTab, setActiveTab] = useState('messages'); // 'notifications' | 'messages' | 'profile' | 'settings'
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [userProfileUrl, setUserProfileUrl] = useState(null);
  const [detectedUsername, setDetectedUsername] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [blockedFeedCount, setBlockedFeedCount] = useState(0);

  // Settings Toggles
  const [strictReelLock, setStrictReelLock] = useState(true);
  const [blockFeeds, setBlockFeeds] = useState(true);
  const [darkModeActive, setDarkModeActive] = useState(true);

  // Android hardware back button handler
  useEffect(() => {
    if (Platform.OS === 'android') {
      const onBackPress = () => {
        if (activeTab === 'settings') {
          setActiveTab('messages');
          return true;
        }
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }
  }, [canGoBack, activeTab]);

  // Tab 1: Notifications (/accounts/activity/)
  const handleTabNotifications = useCallback(() => {
    setActiveTab('notifications');
    webViewRef.current?.injectJavaScript(`
      window.location.href = 'https://www.instagram.com/accounts/activity/';
      true;
    `);
  }, []);

  // Tab 2: Messages (/direct/inbox/) [DEFAULT HOME TAB]
  const handleTabMessages = useCallback(() => {
    setActiveTab('messages');
    webViewRef.current?.injectJavaScript(`
      window.location.href = 'https://www.instagram.com/direct/inbox/';
      true;
    `);
  }, []);

  // Tab 3: Profile (/your_username/) - ALWAYS Opens Profile, NEVER Edit Profile
  const handleTabProfile = useCallback(() => {
    setActiveTab('profile');
    if (detectedUsername) {
      webViewRef.current?.injectJavaScript(`
        window.location.href = 'https://www.instagram.com/${detectedUsername}/';
        true;
      `);
    } else if (userProfileUrl) {
      webViewRef.current?.injectJavaScript(`
        window.location.href = '${userProfileUrl}';
        true;
      `);
    } else {
      // Find avatar link or profile link, never edit profile
      webViewRef.current?.injectJavaScript(`
        (function() {
          const avatar = document.querySelector('a[href^="/"] img[alt*="profile picture" i]')?.closest('a') ||
                         document.querySelector('a[href^="/"][aria-label*="Profile" i]');
          if (avatar && avatar.getAttribute('href')) {
            const path = avatar.getAttribute('href').replace(/^\\/+|\\/+$/g, '');
            if (path && !path.includes('/')) {
              window.location.href = 'https://www.instagram.com/' + path + '/';
              return;
            }
          }
          const profBtn = document.querySelector('a[aria-label*="Profile" i]');
          if (profBtn && profBtn.href) {
            window.location.href = profBtn.href;
          }
        })();
        true;
      `);
    }
  }, [detectedUsername, userProfileUrl]);

  // Direct open Instagram Account Settings inside WebView
  const openInstagramSettings = useCallback((subPath = 'settings') => {
    setActiveTab('messages');
    const targetUrl = subPath === 'settings' 
      ? 'https://www.instagram.com/accounts/settings/'
      : 'https://www.instagram.com/accounts/' + subPath + '/';
    webViewRef.current?.injectJavaScript(`
      window.location.href = "${targetUrl}";
      true;
    `);
  }, []);

  // Tab 4: Settings
  const handleTabSettings = useCallback(() => {
    setActiveTab('settings');
  }, []);

  // Handle messages from Injected JavaScript
  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'PROFILE_DETECTED') {
        setUserProfileUrl(data.url);
        setDetectedUsername(data.username);
      } else if (data.type === 'AUTH_STATE') {
        setIsLoggedIn(!data.isAuth);
      } else if (data.type === 'BLOCKED_FEED') {
        setBlockedFeedCount((prev) => prev + 1);
      }
    } catch (e) {}
  };

  // Clear Session & Cache
  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache & Session',
      'This will clear web storage, cache, and sign you out of Instagram. Do you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear & Log Out',
          style: 'destructive',
          onPress: () => {
            webViewRef.current?.clearCache(true);
            webViewRef.current?.injectJavaScript(`
              try {
                localStorage.clear();
                sessionStorage.clear();
                document.cookie.split(";").forEach(function(c) {
                  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                });
                window.location.href = 'https://www.instagram.com/accounts/login/';
              } catch(e) {}
              true;
            `);
            setActiveTab('messages');
          },
        },
      ]
    );
  };

  // Reload current WebView
  const handleReload = () => {
    webViewRef.current?.reload();
  };

  return (
    <View style={[styles.rootContainer, { paddingTop: safeTop }]}>
      <StatusBar backgroundColor="#000000" barStyle="light-content" translucent={true} />

      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerAnchorLogo}>⚓</Text>
          <Text style={styles.headerBrand}>Anchor</Text>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Focused</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          {canGoBack && activeTab !== 'settings' && (
            <TouchableOpacity
              onPress={() => webViewRef.current?.goBack()}
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.iconText}>◀</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => openInstagramSettings('settings')}
            style={styles.iconButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.iconText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleReload}
            style={styles.iconButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.iconText}>↻</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading Progress Bar */}
      {loadingProgress > 0 && loadingProgress < 1 && activeTab !== 'settings' && (
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${loadingProgress * 100}%` }]} />
        </View>
      )}

      {/* Content Area */}
      <View style={styles.contentContainer}>
        {/* WebView is kept mounted in the background when switching to Settings */}
        <View style={[styles.webviewWrapper, activeTab === 'settings' && styles.hiddenWebview]}>
          <WebView
            ref={webViewRef}
            source={{ uri: 'https://www.instagram.com/direct/inbox/' }}
            injectedJavaScript={INJECTED_JAVASCRIPT}
            injectedJavaScriptBeforeContentLoaded={INJECTED_JAVASCRIPT}
            domStorageEnabled={true}
            javaScriptEnabled={true}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            onMessage={handleMessage}
            onNavigationStateChange={(nav) => setCanGoBack(nav.canGoBack)}
            onLoadProgress={({ nativeEvent }) => setLoadingProgress(nativeEvent.progress)}
            userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
            style={styles.webview}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.loadingText}>Opening Anchor...</Text>
              </View>
            )}
          />
        </View>

        {/* Native Settings Screen (Tab 4) */}
        {activeTab === 'settings' && (
          <ScrollView style={styles.settingsContainer} contentContainerStyle={styles.settingsContent}>
            <View style={styles.settingsHeaderCard}>
              <Text style={styles.settingsAnchorTitle}>⚓ Anchor Control Panel</Text>
              <Text style={styles.settingsSubtitle}>
                Distraction-Free Instagram Client for Android & iOS
              </Text>
            </View>

            {/* Account Status Card */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>ACCOUNT STATUS</Text>
              <View style={styles.accountRow}>
                <View style={styles.accountAvatar}>
                  <Text style={styles.accountAvatarText}>
                    {detectedUsername ? detectedUsername.charAt(0).toUpperCase() : '👤'}
                  </Text>
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>
                    {detectedUsername ? `@${detectedUsername}` : 'Instagram User'}
                  </Text>
                  <Text style={styles.accountSubStatus}>
                    {isLoggedIn ? '🟢 Logged into Instagram Web' : '⚪ Not logged in'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Official Instagram Account Settings Card */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>INSTAGRAM ACCOUNT SETTINGS</Text>
              <Text style={styles.settingsSubtext}>
                Access your official Instagram account preferences, security, and profile:
              </Text>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openInstagramSettings('settings')}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonIcon}>⚙️</Text>
                <View style={styles.actionButtonTextGroup}>
                  <Text style={styles.actionButtonTitle}>Instagram Settings & Privacy</Text>
                  <Text style={styles.actionButtonDesc}>Accounts Center, notifications, blocked users</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openInstagramSettings('privacy_and_security')}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonIcon}>🔒</Text>
                <View style={styles.actionButtonTextGroup}>
                  <Text style={styles.actionButtonTitle}>Privacy & Security</Text>
                  <Text style={styles.actionButtonDesc}>Account privacy, two-factor auth, security</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { borderBottomWidth: 0 }]}
                onPress={() => openInstagramSettings('edit')}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonIcon}>📝</Text>
                <View style={styles.actionButtonTextGroup}>
                  <Text style={styles.actionButtonTitle}>Edit Profile Information</Text>
                  <Text style={styles.actionButtonDesc}>Update bio, name, link, and profile picture</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Focus Protection Stats */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>ACTIVE DISTRACTION SHIELD</Text>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Home & Algorithmic Feeds</Text>
                <Text style={styles.statBadgeSuccess}>BLOCKED 🛡️</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Infinite Reels Carousel</Text>
                <Text style={styles.statBadgeSuccess}>ISOLATED 🔒</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Explore Grid & Search Trends</Text>
                <Text style={styles.statBadgeSuccess}>FILTERED 🚫</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Direct Messages & Chat</Text>
                <Text style={styles.statBadgeNeutral}>UNRESTRICTED 💬</Text>
              </View>
              <View style={[styles.statRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.statLabel}>Distractions Intercepted</Text>
                <Text style={styles.statCountText}>{blockedFeedCount} times</Text>
              </View>
            </View>

            {/* Shield Settings */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>SHIELD PREFERENCES</Text>
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextGroup}>
                  <Text style={styles.toggleTitle}>Strict DM Reel Lock</Text>
                  <Text style={styles.toggleDesc}>
                    Disables swipe-up gestures to prevent scrolling to recommended reels.
                  </Text>
                </View>
                <Switch
                  value={strictReelLock}
                  onValueChange={setStrictReelLock}
                  trackColor={{ false: '#3f3f46', true: '#10b981' }}
                  thumbColor="#ffffff"
                />
              </View>
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextGroup}>
                  <Text style={styles.toggleTitle}>Redirect Home to Inbox</Text>
                  <Text style={styles.toggleDesc}>
                    Automatically navigates straight to DMs if Instagram tries to open the home feed.
                  </Text>
                </View>
                <Switch
                  value={blockFeeds}
                  onValueChange={setBlockFeeds}
                  trackColor={{ false: '#3f3f46', true: '#10b981' }}
                  thumbColor="#ffffff"
                />
              </View>
              <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
                <View style={styles.toggleTextGroup}>
                  <Text style={styles.toggleTitle}>OLED Pure Black Dark Mode</Text>
                  <Text style={styles.toggleDesc}>
                    Maintains pure #000000 background for battery savings and focus.
                  </Text>
                </View>
                <Switch
                  value={darkModeActive}
                  onValueChange={setDarkModeActive}
                  trackColor={{ false: '#3f3f46', true: '#10b981' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* Session Management */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>SESSION ACTIONS</Text>
              <TouchableOpacity
                style={styles.dangerButton}
                onPress={handleClearCache}
                activeOpacity={0.8}
              >
                <Text style={styles.dangerButtonText}>Clear Cache & Log Out</Text>
              </TouchableOpacity>
            </View>

            {/* Version Info */}
            <View style={styles.footerNote}>
              <Text style={styles.footerText}>Anchor v1.0.0 • Distraction-Free Shell</Text>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Fixed 4-Tab Bottom Navigation Bar */}
      <View style={[styles.bottomNav, { paddingBottom: safeBottom }]}>
        {/* Tab 1: Notifications */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={handleTabNotifications}
          activeOpacity={0.7}
        >
          <Text style={[styles.navIcon, activeTab === 'notifications' && styles.navIconActive]}>
            🔔
          </Text>
          <Text style={[styles.navLabel, activeTab === 'notifications' && styles.navLabelActive]}>
            Activity
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Messages [DEFAULT HOME TAB] */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={handleTabMessages}
          activeOpacity={0.7}
        >
          <Text style={[styles.navIcon, activeTab === 'messages' && styles.navIconActive]}>
            💬
          </Text>
          <Text style={[styles.navLabel, activeTab === 'messages' && styles.navLabelActive]}>
            Messages
          </Text>
          {activeTab === 'messages' && <View style={styles.activeIndicatorDot} />}
        </TouchableOpacity>

        {/* Tab 3: Profile */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={handleTabProfile}
          activeOpacity={0.7}
        >
          <Text style={[styles.navIcon, activeTab === 'profile' && styles.navIconActive]}>
            👤
          </Text>
          <Text style={[styles.navLabel, activeTab === 'profile' && styles.navLabelActive]}>
            Profile
          </Text>
        </TouchableOpacity>

        {/* Tab 4: Settings */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={handleTabSettings}
          activeOpacity={0.7}
        >
          <Text style={[styles.navIcon, activeTab === 'settings' && styles.navIconActive]}>
            ⚙️
          </Text>
          <Text style={[styles.navLabel, activeTab === 'settings' && styles.navLabelActive]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    height: 50,
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerAnchorLogo: {
    fontSize: 18,
  },
  headerBrand: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
    marginLeft: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  statusText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#18181b',
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 2,
    width: '100%',
    backgroundColor: '#18181b',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10b981',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webviewWrapper: {
    flex: 1,
    backgroundColor: '#000000',
  },
  hiddenWebview: {
    display: 'none',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#71717a',
    fontSize: 13,
  },
  settingsContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  settingsContent: {
    padding: 16,
    paddingBottom: 32,
  },
  settingsHeaderCard: {
    marginBottom: 20,
    paddingVertical: 8,
  },
  settingsAnchorTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  settingsSubtitle: {
    color: '#71717a',
    fontSize: 13,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#0f0f11',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1f1f23',
  },
  cardHeader: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  settingsSubtext: {
    color: '#a1a1aa',
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1c20',
    gap: 12,
  },
  actionButtonIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  actionButtonTextGroup: {
    flex: 1,
  },
  actionButtonTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonDesc: {
    color: '#71717a',
    fontSize: 11,
    marginTop: 2,
  },
  chevron: {
    color: '#52525b',
    fontSize: 18,
    fontWeight: '600',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  accountAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  accountSubStatus: {
    color: '#10b981',
    fontSize: 12,
    marginTop: 2,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1c20',
  },
  statLabel: {
    color: '#d4d4d8',
    fontSize: 13,
  },
  statBadgeSuccess: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  statBadgeNeutral: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '700',
  },
  statCountText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1c20',
    gap: 12,
  },
  toggleTextGroup: {
    flex: 1,
  },
  toggleTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleDesc: {
    color: '#71717a',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  dangerButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  dangerButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
  footerNote: {
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    color: '#52525b',
    fontSize: 12,
  },
  bottomNav: {
    minHeight: 56,
    paddingTop: 4,
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#18181b',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    position: 'relative',
  },
  navIcon: {
    fontSize: 18,
    marginBottom: 2,
    opacity: 0.5,
  },
  navIconActive: {
    opacity: 1,
  },
  navLabel: {
    color: '#71717a',
    fontSize: 10,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  activeIndicatorDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10b981',
  },
});
