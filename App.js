import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, StatusBar, Platform, View, TouchableOpacity, Text, BackHandler, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const INJECTED_CSS_AND_PRELOAD = `
  (function() {
    if (!document.getElementById('anchor-focus-styles')) {
      const style = document.createElement('style');
      style.id = 'anchor-focus-styles';
      style.innerHTML = \`
        /* 1. Hide Reels & Explore navigation tabs and links */
        a[href="/reels/"], 
        a[href^="/reels/"], 
        a[aria-label*="Reels" i], 
        svg[aria-label*="Reels" i],
        div[data-testid="reels-tab"],
        
        a[href="/explore/"], 
        a[href^="/explore/"], 
        a[aria-label*="Explore" i], 
        svg[aria-label*="Explore" i],
        div[data-testid="explore-tab"],
        
        /* 2. Hide Home Feed triggers */
        a[href="/"] svg[aria-label*="Home" i],
        
        /* 3. Eradicate "Get the app", "Use the app", and app download banners/buttons everywhere */
        div[data-testid*="app-upsell"],
        div[data-testid*="open-in-app"],
        div[role="banner"],
        a[href*="instagram.com/download"],
        a[href*="play.google.com"],
        a[href*="apps.apple.com"],
        a[href*="android-app"],
        a[href*="intent://"],

        /* 4. Eradicate Suggested for you recommendations on profile */
        div[data-testid="suggested-users"] {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
          height: 0 !important;
          max-height: 0 !important;
          overflow: hidden !important;
        }
      \`;
      (document.head || document.documentElement).appendChild(style);
    }
  })();
  true;
`;

const INJECTED_JAVASCRIPT = `
  (function() {
    function sendToNative(data) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    // 1. Inject or update CSS rules
    function applyStyles() {
      if (!document.getElementById('anchor-focus-styles')) {
        const style = document.createElement('style');
        style.id = 'anchor-focus-styles';
        style.innerHTML = \`
          a[href="/reels/"], 
          a[href^="/reels/"], 
          a[aria-label*="Reels" i], 
          svg[aria-label*="Reels" i],
          div[data-testid="reels-tab"],
          a[href="/explore/"], 
          a[href^="/explore/"], 
          a[aria-label*="Explore" i], 
          svg[aria-label*="Explore" i],
          div[data-testid="explore-tab"],
          a[href="/"] svg[aria-label*="Home" i],
          div[data-testid*="app-upsell"],
          div[data-testid*="open-in-app"],
          div[role="banner"],
          a[href*="instagram.com/download"],
          a[href*="play.google.com"],
          a[href*="apps.apple.com"],
          a[href*="android-app"],
          a[href*="intent://"],
          div[data-testid="suggested-users"] {
            display: none !important;
            visibility: hidden !important;
            pointer-events: none !important;
            height: 0 !important;
            max-height: 0 !important;
            overflow: hidden !important;
          }
        \`;
        (document.head || document.documentElement).appendChild(style);
      }
    }

    const ignored = ['direct', 'explore', 'reels', 'accounts', 'stories', 'legal', 'privacy', 'about', 'p', 'reel', 'tv', 'share', 'challenge', 'api', 'instagram'];

    // 2. Dynamic Logged-In User Detection
    window.detectLoggedInUser = function() {
      if (window.__CURRENT_USER__) {
        return window.__CURRENT_USER__;
      }

      // A. Check Direct Inbox Header (displays logged-in user with chevron)
      const headerCandidates = document.querySelectorAll('button, span, h1, h2, div[role="button"]');
      for (let i = 0; i < headerCandidates.length; i++) {
        const el = headerCandidates[i];
        const rect = el.getBoundingClientRect();
        if (rect.top <= 90 && rect.height > 0 && rect.height <= 60) {
          const txt = (el.innerText || el.textContent || '').trim();
          const clean = txt.split('\\n')[0].replace(/[∨⌄▼v\\s]/g, '');
          if (/^[a-zA-Z0-9._]{3,30}$/.test(clean) && !ignored.includes(clean.toLowerCase())) {
            if (txt.includes('∨') || txt.includes('⌄') || txt.includes('▼')) {
              window.__CURRENT_USER__ = clean;
              sendToNative({ type: 'LOGGED_IN_USER', username: clean });
              return clean;
            }
          }
        }
      }

      // B. Check avatar links across the DOM
      const avatarLinks = document.querySelectorAll('a[href^="/"] img[alt*="profile picture" i], a[href^="/"][role="link"] img, a[aria-label*="Profile" i]');
      for (let i = 0; i < avatarLinks.length; i++) {
        const link = avatarLinks[i].closest('a');
        if (link && link.getAttribute('href')) {
          const href = link.getAttribute('href').replace(/^\\/+|\\/+$/g, '');
          if (href && !href.includes('/') && !ignored.includes(href.toLowerCase())) {
            window.__CURRENT_USER__ = href;
            sendToNative({ type: 'LOGGED_IN_USER', username: href });
            return href;
          }
        }
      }

      // C. Check avatar img alt tags: "[username]'s profile picture"
      const imgs = document.querySelectorAll('img[alt*="profile picture" i]');
      for (let i = 0; i < imgs.length; i++) {
        const alt = imgs[i].getAttribute('alt') || '';
        const match = alt.match(/^([^'’]+)['’]s profile picture/i);
        if (match && match[1] && !match[1].includes(' ')) {
          const u = match[1].trim();
          if (!ignored.includes(u.toLowerCase())) {
            window.__CURRENT_USER__ = u;
            sendToNative({ type: 'LOGGED_IN_USER', username: u });
            return u;
          }
        }
      }

      // D. Check window._sharedData / __initialData
      if (window._sharedData?.config?.viewer?.username) {
        const u = window._sharedData.config.viewer.username;
        window.__CURRENT_USER__ = u;
        sendToNative({ type: 'LOGGED_IN_USER', username: u });
        return u;
      }
      if (window.__initialData?.data?.viewer?.username) {
        const u = window.__initialData.data.viewer.username;
        window.__CURRENT_USER__ = u;
        sendToNative({ type: 'LOGGED_IN_USER', username: u });
        return u;
      }

      // E. Check localStorage Polaris / session stores
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          const val = localStorage.getItem(key);
          if (val && val.includes('username')) {
            const match = val.match(/"username"\\s*:\\s*"([a-zA-Z0-9._]{3,30})"/i);
            if (match && match[1] && !ignored.includes(match[1].toLowerCase())) {
              window.__CURRENT_USER__ = match[1];
              sendToNative({ type: 'LOGGED_IN_USER', username: match[1] });
              return match[1];
            }
          }
        }
      } catch(e) {}

      return null;
    };

    // 3. Open Self Profile Handler
    window.openSelfProfile = function() {
      const user = window.detectLoggedInUser();
      if (user) {
        window.location.href = 'https://www.instagram.com/' + user + '/';
        return;
      }
      const avatar = document.querySelector('a[href^="/"] img[alt*="profile picture" i]')?.closest('a') ||
                     document.querySelector('a[href^="/"][role="link"] img')?.closest('a') ||
                     document.querySelector('a[aria-label*="Profile" i]');
      if (avatar) {
        if (avatar.getAttribute('href') && !avatar.getAttribute('href').includes('explore')) {
          window.location.href = avatar.href;
          return;
        }
        avatar.click();
        return;
      }
      window.location.href = 'https://www.instagram.com/accounts/edit/';
    };

    // 4. Eradicate "Get the app" & "Use the app" Prompts Everywhere
    function purgeAppBanners() {
      // 1. Target known app banners by attribute
      document.querySelectorAll(
        'div[data-testid*="app-upsell"], div[data-testid*="open-in-app"], div[role="banner"] a[href*="play.google.com"], a[href*="instagram.com/download"]'
      ).forEach(function(el) {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('height', '0px', 'important');
      });

      // 2. Safe text scan on leaf buttons and links only
      const candidates = document.querySelectorAll('button, a, span, p');
      for (let i = 0; i < candidates.length; i++) {
        const el = candidates[i];
        if (el.children.length > 1) continue;
        const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
        if (
          txt === 'get the app' || 
          txt === 'use the app' || 
          txt === 'open in app' || 
          txt === 'get instagram' || 
          txt === 'open app' || 
          txt === 'install' ||
          txt === 'get the instagram app' ||
          txt === 'open in the instagram app'
        ) {
          let target = el.closest('button, a') || el;
          let cur = el;
          while (cur && cur !== document.body && cur !== document.documentElement) {
            const comp = window.getComputedStyle(cur);
            if (comp.position === 'fixed' || comp.position === 'sticky') {
              const r = cur.getBoundingClientRect();
              if (r.height > 0 && r.height <= 70) {
                target = cur;
                break;
              }
            }
            cur = cur.parentElement;
          }
          target.style.setProperty('display', 'none', 'important');
          target.style.setProperty('visibility', 'hidden', 'important');
          target.style.setProperty('height', '0px', 'important');
        }
      }
    }

    // 5. Precision Bottom Bar Eradication (Geometric Filtering Only)
    function purgeToastbar() {
      window.detectLoggedInUser();

      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const candidates = document.querySelectorAll('div, footer, nav, [role="navigation"], [role="tablist"]');

      for (let i = 0; i < candidates.length; i++) {
        const el = candidates[i];
        if (el.querySelector('input, textarea, form, [contenteditable="true"]')) continue;

        const comp = window.getComputedStyle(el);
        if (comp.position === 'fixed' || comp.position === 'sticky') {
          const rect = el.getBoundingClientRect();
          if (rect.height >= 35 && rect.height <= 85 && rect.top >= vh - 95 && rect.width >= vw * 0.7) {
            el.style.setProperty('display', 'none', 'important');
            el.style.setProperty('visibility', 'hidden', 'important');
            el.style.setProperty('pointer-events', 'none', 'important');
            el.style.setProperty('height', '0px', 'important');
          }
        }
      }

      // Hide "Suggested for you" follow cards on profile
      document.querySelectorAll('h2, h3, span, div').forEach(function(el) {
        const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
        if (txt === 'suggested for you' || txt === 'suggestions for you') {
          let box = el.closest('div[data-testid="suggested-users"]') || el.closest('section');
          if (box && box.offsetHeight < 350) {
            box.style.setProperty('display', 'none', 'important');
          }
        }
      });

      if (document.body) document.body.style.setProperty('padding-bottom', '0px', 'important');
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.style.setProperty('padding-bottom', '0px', 'important');
    }

    // 6. Handle Notifications / Activity Trigger
    function handleActivityView() {
      if (window.__ANCHOR_ACTIVE_TAB__ === 'activity' || window.location.search.includes('activity=1')) {
        const headings = document.querySelectorAll('h1, h2, h3, header, span');
        let isNotifOpen = false;
        for (let i = 0; i < headings.length; i++) {
          if ((headings[i].innerText || '').toLowerCase().includes('notification')) {
            isNotifOpen = true;
            break;
          }
        }
        if (!isNotifOpen && !window.__ACTIVITY_TRIGGERED__) {
          window.__ACTIVITY_TRIGGERED__ = true;
          const heart = document.querySelector('svg[aria-label*="Activity" i], svg[aria-label*="Notification" i], a[href*="/activity"]')?.closest('a, button, div[role="button"]');
          if (heart) {
            heart.click();
          }
        }
      }
    }

    // 7. Route Enforcement (Keep user on distraction-free pages)
    function enforceInboxRoute() {
      if (window.__ANCHOR_ACTIVE_TAB__ === 'activity' || window.location.search.includes('activity=1')) {
        return; // Allow viewing activity notifications
      }
      const path = window.location.pathname;
      if (path === '/' || path === '/#' || path === '' || path.startsWith('/reels') || path.startsWith('/explore')) {
        window.location.replace('https://www.instagram.com/direct/inbox/');
      }
    }

    applyStyles();
    purgeAppBanners();
    enforceInboxRoute();
    purgeToastbar();
    handleActivityView();

    // 8. Lightweight MutationObserver (debounced to 100ms)
    let isThrottled = false;
    const observer = new MutationObserver(() => {
      if (!isThrottled) {
        isThrottled = true;
        setTimeout(() => {
          isThrottled = false;
          applyStyles();
          purgeAppBanners();
          enforceInboxRoute();
          purgeToastbar();
          handleActivityView();
        }, 100);
      }
    });

    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  })();
  true;
`;

function MainScreen() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef(null);
  const [activeTab, setActiveTab] = useState('messages');
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [canGoBack, setCanGoBack] = useState(false);

  // Hardware Back Button Handler for Android
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBackPress = () => {
      handleGoBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [canGoBack, activeTab]);

  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'LOGGED_IN_USER' && data.username) {
        setLoggedInUser(data.username);
      }
    } catch(e) {}
  };

  const handleGoBack = () => {
    if (!webViewRef.current) return;
    webViewRef.current.injectJavaScript(`
      (function() {
        // 1. Look for Instagram's in-page back button (e.g. back chevron in header)
        const igBack = document.querySelector('svg[aria-label*="Back" i], button[aria-label*="Back" i], a[aria-label*="Back" i], header button, header svg')?.closest('button, a, div[role="button"]');
        if (igBack) {
          igBack.click();
          return;
        }
        // 2. Fall back to window.history.back
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = 'https://www.instagram.com/direct/inbox/';
        }
      })();
      true;
    `);
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
    }
  };

  const handleReload = () => {
    if (!webViewRef.current) return;
    webViewRef.current.injectJavaScript(`
      window.__ACTIVITY_TRIGGERED__ = false;
      window.location.reload();
      true;
    `);
    webViewRef.current.reload();
  };

  const handleTabPress = (tab) => {
    setActiveTab(tab);
    if (!webViewRef.current) return;

    if (tab === 'activity') {
      webViewRef.current.injectJavaScript(`
        (function() {
          window.__ANCHOR_ACTIVE_TAB__ = 'activity';
          const headings = document.querySelectorAll('h1, h2, h3, header, span');
          let isNotifOpen = false;
          for (let i = 0; i < headings.length; i++) {
            if ((headings[i].innerText || '').toLowerCase().includes('notification')) {
              isNotifOpen = true;
              break;
            }
          }
          if (!isNotifOpen) {
            const heart = document.querySelector('svg[aria-label*="Activity" i], svg[aria-label*="Notification" i], a[href*="/activity"]')?.closest('a, button, div[role="button"]');
            if (heart) {
              heart.click();
            } else {
              window.location.href = 'https://www.instagram.com/?activity=1';
            }
          }
        })();
        true;
      `);
    } else if (tab === 'messages') {
      webViewRef.current.injectJavaScript(`
        window.__ANCHOR_ACTIVE_TAB__ = 'messages';
        if (window.location.pathname !== '/direct/inbox/' && window.location.pathname !== '/direct/inbox') {
          window.location.href = 'https://www.instagram.com/direct/inbox/';
        }
        true;
      `);
    } else if (tab === 'profile') {
      webViewRef.current.injectJavaScript(`window.__ANCHOR_ACTIVE_TAB__ = 'profile'; true;`);
      if (loggedInUser) {
        webViewRef.current.injectJavaScript(`
          window.location.href = 'https://www.instagram.com/${loggedInUser}/';
          true;
        `);
      } else {
        webViewRef.current.injectJavaScript(`
          if (typeof window.openSelfProfile === 'function') {
            window.openSelfProfile();
          } else if (typeof window.detectLoggedInUser === 'function') {
            const u = window.detectLoggedInUser();
            if (u) {
              window.location.href = 'https://www.instagram.com/' + u + '/';
            }
          }
          true;
        `);
      }
    } else if (tab === 'settings') {
      webViewRef.current.injectJavaScript(`
        window.__ANCHOR_ACTIVE_TAB__ = 'settings';
        if (!window.location.pathname.includes('/settings')) {
          window.location.href = 'https://www.instagram.com/accounts/settings/';
        }
        true;
      `);
    }
  };

  const bottomPadding = Math.max(insets.bottom, 10);
  const topPadding = insets.top;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#080808" barStyle="light-content" translucent={true} />

      {/* Anchor Top Header / Navbar */}
      <View style={[styles.topHeader, { paddingTop: topPadding, height: 48 + topPadding }]}>
        <View style={styles.titleGroup}>
          <Text style={styles.brandTitle}>⚓ Anchor</Text>
          <View style={styles.focusedBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.badgeText}>Focused</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerBtn} 
            activeOpacity={0.6}
            delayPressIn={0} 
            onPress={handleGoBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.headerBtnText}>◀</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerBtn} 
            activeOpacity={0.6}
            delayPressIn={0} 
            onPress={handleReload}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.headerBtnText}>↻</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main WebView Container */}
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://www.instagram.com/direct/inbox/' }}
        style={styles.webview}
        androidLayerType="hardware"
        renderToHardwareTextureAndroid={true}
        cacheEnabled={true}
        cacheMode="LOAD_DEFAULT"
        databaseEnabled={true}
        domStorageEnabled={true}
        incognito={false}
        javaScriptEnabled={true}
        overScrollMode="never"
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        scalesPageToFit={false}
        setSupportMultipleWindows={false}
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
        injectedJavaScriptBeforeContentLoaded={INJECTED_CSS_AND_PRELOAD}
        injectedJavaScript={INJECTED_JAVASCRIPT}
        onLoadEnd={() => {
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(INJECTED_JAVASCRIPT);
          }
        }}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
        }}
        onMessage={onMessage}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        )}
      />

      {/* Anchor 4-Tab Bottom Navigation Bar */}
      <View style={[styles.bottomNav, { paddingBottom: bottomPadding, height: 54 + bottomPadding }]}>
        <TouchableOpacity style={styles.tabButton} delayPressIn={0} onPress={() => handleTabPress('activity')}>
          <Text style={[styles.tabIcon, activeTab === 'activity' && styles.tabActiveIcon]}>🔔</Text>
          <Text style={[styles.tabLabel, activeTab === 'activity' && styles.tabActiveText]}>Activity</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton} delayPressIn={0} onPress={() => handleTabPress('messages')}>
          <Text style={[styles.tabIcon, activeTab === 'messages' && styles.tabActiveIcon]}>💬</Text>
          <Text style={[styles.tabLabel, activeTab === 'messages' && styles.tabActiveText]}>Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton} delayPressIn={0} onPress={() => handleTabPress('profile')}>
          <Text style={[styles.tabIcon, activeTab === 'profile' && styles.tabActiveIcon]}>👤</Text>
          <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabActiveText]}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton} delayPressIn={0} onPress={() => handleTabPress('settings')}>
          <Text style={[styles.tabIcon, activeTab === 'settings' && styles.tabActiveIcon]}>⚙️</Text>
          <Text style={[styles.tabLabel, activeTab === 'settings' && styles.tabActiveText]}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainScreen />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topHeader: {
    backgroundColor: '#080808',
    borderBottomWidth: 1,
    borderBottomColor: '#1c1c1e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  focusedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 185, 129, 0.15)',
    borderColor: 'rgba(15, 185, 129, 0.4)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0fb981',
  },
  badgeText: {
    color: '#0fb981',
    fontSize: 11,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1c1c1e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#38383a',
  },
  headerBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#080808',
    borderTopWidth: 1,
    borderTopColor: '#1c1c1e',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 19,
    opacity: 0.5,
  },
  tabActiveIcon: {
    opacity: 1.0,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8e8e93',
    marginTop: 2,
  },
  tabActiveText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
