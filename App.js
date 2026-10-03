import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  StatusBar,
  View,
  Text,
  TouchableOpacity,
  BackHandler,
  Platform,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Svg, { Path, Circle } from 'react-native-svg';

// Injection script that respects system light/dark mode and restores native Instagram aesthetics
const getInjectedJS = (isDark) => `
  (function() {
    const isDarkMode = ${isDark};
    const themeClass = isDarkMode ? 'dark' : 'light';

    // 1. Sync theme cookies
    try {
      document.cookie = "theme=" + themeClass + "; path=/; max-age=31536000; domain=.instagram.com";
      document.cookie = "theme=" + themeClass + "; path=/; max-age=31536000";
    } catch(e) {}

    // 2. Viewport meta tag
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      if (document.head) document.head.appendChild(meta);
    }
    if (meta) {
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    }

    const applyNativeEnhancements = () => {
      // Update root color scheme attributes naturally
      if (document.documentElement) {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(themeClass);
        document.documentElement.style.setProperty('color-scheme', themeClass, 'important');
        document.documentElement.style.setProperty('background-color', isDarkMode ? '#000000' : '#FFFFFF', 'important');
      }
      if (document.body) {
        document.body.style.setProperty('background-color', isDarkMode ? '#000000' : '#FFFFFF', 'important');
        document.body.style.setProperty('color-scheme', themeClass, 'important');
      }

      const styleId = 'anchor-native-ui-fix';
      let style = document.getElementById(styleId);
      if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        (document.head || document.documentElement).appendChild(style);
      }

      style.innerHTML = \`
        /* REMOVE ALL CUSTOM BOX OUTLINES AND FORCED BORDERS */
        * {
          box-shadow: none !important;
          outline: none !important;
        }

        /* Enforce root background colors based on current system theme */
        html, body, #react-root {
          background-color: \${isDarkMode ? '#000000' : '#FFFFFF'} !important;
        }

        /* Instagram Native Theme Variables */
        :root, html, body {
          color-scheme: \${themeClass} !important;
          --primary-background: \${isDarkMode ? '#000000' : '#FFFFFF'} !important;
          --secondary-background: \${isDarkMode ? '#121212' : '#FAFAFA'} !important;
          --ig-primary-background: \${isDarkMode ? '#000000' : '#FFFFFF'} !important;
          --ig-secondary-background: \${isDarkMode ? '#121212' : '#FAFAFA'} !important;
          --ig-stroke: \${isDarkMode ? '#262626' : '#DBDBDB'} !important;
          --card-background: \${isDarkMode ? '#000000' : '#FFFFFF'} !important;
        }

        /* DM Chat List Fixes & Container Theming */
        div[role="listbox"], div[role="list"], div[aria-label*="Direct" i] {
          background-color: \${isDarkMode ? '#000000' : '#FFFFFF'} !important;
        }

        /* Text Input & Search Bar Clean Formatting */
        input, textarea, select {
          background-color: \${isDarkMode ? '#121212' : '#FAFAFA'} !important;
          border: 1px solid \${isDarkMode ? '#262626' : '#DBDBDB'} !important;
          color: \${isDarkMode ? '#FFFFFF' : '#000000'} !important;
          border-radius: 8px !important;
        }

        /* Bottom safe scrolling clearance strictly on root main container */
        main[role="main"] {
          padding-bottom: 95px !important;
          margin-bottom: 0 !important;
          box-sizing: border-box !important;
        }

        /* Eliminate clutter: Reels tabs and Explore tabs */
        a[href*="/reels/"], 
        a[href^="/reels/"], 
        a[aria-label*="Reels" i], 
        svg[aria-label*="Reels" i],
        svg[aria-label*="Clips" i],
        div[data-testid="reels-tab"],
        a[href*="/explore/"], 
        a[href^="/explore/"], 
        a[aria-label*="Explore" i], 
        svg[aria-label*="Explore" i],
        div[data-testid="explore-tab"],
        a[href="/"] svg[aria-label*="Home" i] { 
          display: none !important; 
          visibility: hidden !important;
          pointer-events: none !important;
          height: 0 !important;
          overflow: hidden !important;
        }

        /* Completely Eradicate Instagram Mobile Web Bottom Bar */
        footer[role="contentinfo"],
        footer,
        div[data-testid="bottom-nav"],
        div[data-testid="mobile-nav-bar"],
        div[data-testid="tab-bar"],
        div[data-testid="bottom_bar"] {
          display: none !important; 
          visibility: hidden !important;
          pointer-events: none !important;
          height: 0 !important;
          max-height: 0 !important;
          overflow: hidden !important;
          opacity: 0 !important;
        }

        /* Hide Threads and Suggested Clutter without breaking Header flexbox */
        a[href*="threads.net"],
        a[aria-label*="Threads" i],
        svg[aria-label*="Threads" i],
        button:has(svg[aria-label*="Discover" i]),
        button:has(svg[aria-label*="Similar" i]),
        a[href*="/similar_accounts/"],
        div[data-testid*="suggested" i],
        div[role="tablist"] a[href*="/reels/"],
        div[role="tablist"] a[href*="/channel/"] {
          display: none !important;
        }

        /* Hide Saved / Bookmark Tab on Profile */
        a[href*="/saved/"],
        div[role="tab"]:has(svg[aria-label*="Saved" i]),
        svg[aria-label*="Saved" i] {
          display: none !important;
        }

        /* Cleanly hide web-only app installation banners */
        div[style*="position: fixed"][style*="bottom: 0"],
        div[style*="bottom"][aria-label*="app" i],
        a[href*="instagram://"],
        a[href*="itunes.apple.com"],
        a[href*="play.google.com"],
        [aria-label*="Use the app" i],
        [aria-label*="Get the app" i],
        [aria-label*="Open in app" i],
        .smartbanner,
        div[data-testid*="app-upsell"],
        div[data-testid*="open-in-app"],
        div[data-testid*="smart-banner"] {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
          height: 0 !important;
          max-height: 0 !important;
        }
      \`;
    };

    applyNativeEnhancements();
    const observer = new MutationObserver(applyNativeEnhancements);
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });

    // Active DOM cleaner for dynamic app banners
    const purgeBanners = () => {
      const elements = document.querySelectorAll('div, a, span, button');
      elements.forEach(el => {
        const text = (el.innerText || el.textContent || '').toLowerCase();
        if (text.includes('use the app') || text.includes('open in app') || text.includes('get the app')) {
          let current = el;
          for (let i = 0; i < 5; i++) {
            if (!current || !current.parentElement) break;
            if (current.tagName === 'BODY' || current.tagName === 'HTML' || current.tagName === 'MAIN') break;
            const style = window.getComputedStyle(current);
            if (style.position === 'fixed' || style.position === 'sticky' || current.getAttribute('role') === 'dialog' || style.bottom === '0px') {
              current.style.setProperty('display', 'none', 'important');
              current.style.setProperty('visibility', 'hidden', 'important');
              current.style.setProperty('height', '0px', 'important');
              current.style.setProperty('max-height', '0px', 'important');
              current.style.setProperty('opacity', '0', 'important');
              current.style.setProperty('pointer-events', 'none', 'important');
              return;
            }
            current = current.parentElement;
          }
        }
      });
    };
    purgeBanners();
    setInterval(purgeBanners, 1000);

    // Dynamic user extraction for Profile tab
    function detectUser() {
      if (window.__ANCHOR_USER__) return;
      try {
        const userMeta = document.querySelector('meta[property="al:ios:url"]');
        if (userMeta && userMeta.content) {
          const u = userMeta.content.split('user?username=')[1];
          if (u && !['explore', 'reels', 'direct', 'stories', 'accounts'].includes(u)) {
            window.__ANCHOR_USER__ = u;
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOGGED_IN_USER', username: u }));
            }
            return;
          }
        }

        const link = document.querySelector('a[href^="/"][role="link"]:has(img[alt*="profile picture" i])') ||
                     document.querySelector('a[href*="/"][role="link"]:has(img)') ||
                     document.querySelector('a[href^="/"]:has(img[alt*="profile picture" i])');
        if (link) {
          const u2 = (link.getAttribute('href') || '').replace(/\\//g, '').split('?')[0];
          if (u2 && !['explore', 'reels', 'direct', 'stories', 'accounts'].includes(u2)) {
            window.__ANCHOR_USER__ = u2;
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOGGED_IN_USER', username: u2 }));
            }
            return;
          }
        }

        const headerEls = document.querySelectorAll('header span, header h1, header button span, header div[role="button"]');
        for (let i = 0; i < headerEls.length; i++) {
          const raw = (headerEls[i].textContent || '').trim().split('\\n')[0].replace(/[∨⌄▼v\\s]/g, '');
          if (/^[a-zA-Z0-9._]{3,30}$/.test(raw) && !['explore', 'reels', 'direct', 'stories', 'accounts', 'messages', 'notifications', 'search', 'settings'].includes(raw.toLowerCase())) {
            window.__ANCHOR_USER__ = raw;
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOGGED_IN_USER', username: raw }));
            }
            return;
          }
        }
      } catch(e) {}
    }
    detectUser();
    setInterval(detectUser, 1500);

    // Reliable in-page router
    window.__anchorRoute = function(destination) {
      if (destination === 'activity') {
        window.location.href = 'https://www.instagram.com/accounts/activity/';
      } else if (destination === 'messages') {
        window.location.href = 'https://www.instagram.com/direct/inbox/';
      } else if (destination === 'profile') {
        let handle = window.__ANCHOR_USER__ || null;
        if (!handle) {
          try {
            const userMeta = document.querySelector('meta[property="al:ios:url"]');
            if (userMeta && userMeta.content) {
              handle = userMeta.content.split('user?username=')[1];
            }
          } catch (e) {}
        }
        if (!handle) {
          const profileLink = document.querySelector('a[href^="/"]:has(img[alt*="profile picture" i])') ||
                              document.querySelector('a[href*="/"][role="link"]:has(img)');
          if (profileLink && profileLink.getAttribute('href')) {
            const h = profileLink.getAttribute('href').replace(/\\//g, '').split('?')[0];
            if (h && !['explore', 'reels', 'direct', 'stories', 'accounts'].includes(h)) {
              handle = h;
            }
          }
        }
        if (handle && !handle.includes('accounts') && !handle.includes('explore')) {
          window.location.href = 'https://www.instagram.com/' + handle + '/';
        } else {
          const profileBtn = document.querySelector('a[href^="/"]:has(img[alt*="profile picture" i])') ||
                             document.querySelector('a[href*="/"][role="link"]:has(img)') ||
                             document.querySelector('a[aria-label*="Profile" i]');
          if (profileBtn) {
            profileBtn.click();
          } else {
            window.location.href = 'https://www.instagram.com/';
          }
        }
      } else if (destination === 'settings') {
        window.location.href = 'https://www.instagram.com/settings/';
      }
    };
  })();
  true;
`;

// Clean SVG Icons
const ActivityIcon = ({ active, color }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill={active ? color : 'none'}>
    <Path
      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const MessagesIcon = ({ active, color }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill={active ? color : 'none'}>
    <Path
      d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ProfileIcon = ({ active, color }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill={active ? color : 'none'}>
    <Path
      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx={12} cy={7} r={4} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SettingsIcon = ({ active, color }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill={active ? color : 'none'}>
    <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TABS = [
  { id: 'activity', label: 'Activity', Icon: ActivityIcon },
  { id: 'messages', label: 'Messages', Icon: MessagesIcon },
  { id: 'profile', label: 'Profile', Icon: ProfileIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
];

function MainApp() {
  const webViewRef = useRef(null);
  const [activeTab, setActiveTab] = useState('messages');
  const [canGoBack, setCanGoBack] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const isDark = systemColorScheme === 'dark';

  const themeBg = isDark ? '#000000' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';

  useEffect(() => {
    if (Platform.OS === 'android') {
      const onBackPress = () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }
  }, [canGoBack]);

  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data && data.type === 'LOGGED_IN_USER' && data.username) {
        setLoggedInUser(data.username);
      }
    } catch (e) {}
  };

  // Reliable navigation handler targeting true native web routes
  const navigateTo = (tab) => {
    setActiveTab(tab);
    if (!webViewRef.current) return;

    if (tab === 'activity') {
      webViewRef.current.injectJavaScript("window.location.href = 'https://www.instagram.com/accounts/activity/'; true;");
    } else if (tab === 'messages') {
      webViewRef.current.injectJavaScript("window.location.href = 'https://www.instagram.com/direct/inbox/'; true;");
    } else if (tab === 'profile') {
      if (loggedInUser) {
        webViewRef.current.injectJavaScript(`window.location.href = 'https://www.instagram.com/${loggedInUser}/'; true;`);
      } else {
        const resolveProfileJS = `
          (function() {
            if (typeof window.__anchorRoute === 'function') {
              window.__anchorRoute('profile');
              return;
            }
            let handle = null;
            try {
              const profileLink = document.querySelector('a[href*="/"][role="link"]:has(img)');
              if (profileLink) {
                const href = profileLink.getAttribute('href');
                if (href && !href.includes('accounts') && !href.includes('explore') && !href.includes('direct')) {
                  handle = href.replace(/\\//g, '').split('?')[0];
                }
              }
            } catch(e) {}

            if (handle) {
              window.location.href = 'https://www.instagram.com/' + handle + '/';
            } else {
              window.location.href = 'https://www.instagram.com/';
            }
          })();
          true;
        `;
        webViewRef.current.injectJavaScript(resolveProfileJS);
      }
    } else if (tab === 'settings') {
      // Directs to Instagram's real Settings page (NOT Edit Profile)
      webViewRef.current.injectJavaScript("window.location.href = 'https://www.instagram.com/settings/'; true;");
    }
  };

  const topPadding = insets.top;

  return (
    <View style={[styles.container, { backgroundColor: themeBg }]}>
      <StatusBar
        backgroundColor={isDark ? '#000000' : '#FFFFFF'}
        barStyle={isDark ? 'light-content' : 'dark-content'}
        translucent={Platform.OS === 'android'}
      />

      {/* Modern Slim Top Header */}
      <View
        style={[
          styles.topHeader,
          {
            paddingTop: topPadding,
            height: 44 + topPadding,
            backgroundColor: themeBg,
            borderBottomColor: isDark ? '#1C1C1E' : '#E5E5EA',
          },
        ]}
      >
        <View style={styles.titleGroup}>
          <Text style={[styles.brandTitle, { color: textColor }]}>⚓ Anchor</Text>
          <View style={[styles.focusedBadge, { backgroundColor: isDark ? 'rgba(52, 199, 89, 0.15)' : 'rgba(52, 199, 89, 0.12)' }]}>
            <View style={styles.statusDot} />
            <Text style={styles.badgeText}>Focused</Text>
          </View>
        </View>
      </View>

      {/* Clean WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://www.instagram.com/direct/inbox/' }}
        style={[styles.webview, { backgroundColor: themeBg }]}
        containerStyle={{ backgroundColor: themeBg }}
        domStorageEnabled={true}
        javaScriptEnabled={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        originWhitelist={['*']}
        mixedContentMode="always"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        scalesPageToFit={false}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        userAgent="Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
        allowsBackForwardNavigationGestures={true}
        injectedJavaScriptBeforeContentLoaded={getInjectedJS(isDark)}
        injectedJavaScript={getInjectedJS(isDark)}
        onNavigationStateChange={(navState) => {
          if (navState.canGoBack !== canGoBack) {
            setCanGoBack(navState.canGoBack);
          }
        }}
        onMessage={onMessage}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={[styles.loadingContainer, { backgroundColor: themeBg }]}>
            <ActivityIndicator size="small" color={isDark ? '#FFFFFF' : '#000000'} />
          </View>
        )}
      />

      {/* Adaptive Floating Glass Navigation Bar */}
      <View style={[styles.navBarWrapper, { bottom: Math.max(insets.bottom, 16) + 4 }]}>
        <View
          style={[
            styles.navBar,
            {
              backgroundColor: isDark ? 'rgba(24, 24, 27, 0.88)' : 'rgba(255, 255, 255, 0.90)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            },
          ]}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.Icon;
            const itemColor = isActive
              ? (isDark ? '#FFFFFF' : '#000000')
              : (isDark ? '#8E8E93' : '#8E8E93');

            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => navigateTo(tab.id)}
                activeOpacity={0.7}
                style={[
                  styles.navItem,
                  isActive && (isDark ? styles.activeNavItemDark : styles.activeNavItemLight),
                ]}
              >
                <TabIcon active={isActive} color={itemColor} />
                <Text
                  style={[
                    styles.navText,
                    {
                      color: itemColor,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Anchor ErrorBoundary caught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>⚓ Anchor</Text>
          <Text style={{ color: '#ef4444', fontSize: 14, textAlign: 'center', marginBottom: 20 }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={{ color: '#ffffff', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <MainApp />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    zIndex: 10,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  focusedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34C759',
    letterSpacing: 0.2,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  navBarWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 100,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 32,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 22,
    gap: 6,
  },
  activeNavItemDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  activeNavItemLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  navText: {
    fontSize: 12,
    letterSpacing: -0.2,
  },
});
