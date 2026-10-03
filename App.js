import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, StatusBar, View, Text, TouchableOpacity, Pressable, BackHandler, Platform, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Svg, { Path, Circle } from 'react-native-svg';

// Injected CSS and lightweight DOM helpers
const INJECTED_CSS_AND_PRELOAD = `
  (function() {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      if (document.head) document.head.appendChild(meta);
    }
    if (meta) {
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    }

    if (!document.getElementById('anchor-speed-styles')) {
      const style = document.createElement('style');
      style.id = 'anchor-speed-styles';
      style.innerHTML = \`
        /* 1. Eliminate clutter, Reels tabs, Explore tabs, and home buttons */
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

        /* 2. Completely Eradicate Instagram Mobile Web Bottom Bar */
        footer[role="contentinfo"],
        footer,
        div[data-testid="bottom-nav"],
        div[data-testid="mobile-nav-bar"],
        div[data-testid="tab-bar"],
        div[data-testid="bottom_bar"],
        div[data-testid*="app-upsell"],
        div[data-testid*="open-in-app"] {
          display: none !important; 
          visibility: hidden !important;
          pointer-events: none !important;
          height: 0 !important;
          max-height: 0 !important;
          overflow: hidden !important;
          opacity: 0 !important;
        }

        /* 3. Remove Profile Tab Unnecessary Clutter & Buttons */
        /* Threads promotional buttons */
        a[href*="threads.net"],
        a[aria-label*="Threads" i],
        svg[aria-label*="Threads" i],
        div[role="button"]:has(svg[aria-label*="Threads" i]),
        div:has(> a[href*="threads.net"]),
        /* Camera / Create story buttons in profile header */
        header a[href*="/stories/create"],
        header svg[aria-label*="Camera" i],
        header svg[aria-label*="Story" i],
        header svg[aria-label*="Stories" i],
        header div[role="button"]:has(svg[aria-label*="Camera" i]),
        header div[role="button"]:has(svg[aria-label*="Story" i]),
        /* Suggested accounts & discover people in profile */
        button:has(svg[aria-label*="Discover" i]),
        button:has(svg[aria-label*="Similar" i]),
        a[href*="/similar_accounts/"],
        div[data-testid*="suggested" i],
        /* Reposts / Loop / Reels tabs in profile */
        div[role="tablist"] a[href*="/reels/"],
        div[role="tablist"] a[href*="/channel/"],
        /* Native app upsell banners & buttons */
        a[href*="instagram://"],
        div:has(> a[href*="instagram://"]) {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
          height: 0 !important;
          overflow: hidden !important;
        }

        /* 4. Fix Profile UI: Clean Header, Spacing, and No Overlapping/Clipping */
        header[role="banner"] {
          background-color: #000000 !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
          height: 48px !important;
        }

        /* Profile page layout spacing: prevent fixed header from cutting off avatar & username */
        main, section, div[role="main"] {
          padding-top: 28px !important;
          padding-bottom: 100px !important;
        }

        /* Ensure avatar circle is never clipped */
        main header img,
        main section img {
          border-radius: 50% !important;
          object-fit: cover !important;
        }

        /* Style Profile Action Buttons (Edit Profile, View Archive) into modern pills */
        main section a[href*="/accounts/edit/"],
        main section a[href*="/archive/"] {
          border-radius: 9999px !important;
          background: rgba(255, 255, 255, 0.12) !important;
          border: 1px solid rgba(255, 255, 255, 0.20) !important;
          color: #ffffff !important;
          font-weight: 600 !important;
          padding: 8px 16px !important;
        }

        /* Clean Profile Grid Tablist */
        div[role="tablist"] {
          border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
          background-color: transparent !important;
        }

        /* 5. Modern Pill Toast Notifications & Alerts */
        .toast-bar, 
        div[role="alert"], 
        div[role="status"],
        div[class*="toast" i],
        div[class*="Toast" i],
        div[data-testid*="toast" i] {
          border-radius: 9999px !important; /* Forces maximum pill curves */
          padding: 12px 24px !important;
          background: rgba(22, 22, 22, 0.85) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          backdrop-filter: blur(16px) !important;
          border: 1.5px solid rgba(255, 255, 255, 0.18) !important;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35) !important;
          
          /* Smooth Hover Transition */
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
          overflow: hidden !important;
        }

        /* Curvy Glass Hover & Active States */
        .toast-bar:hover, 
        div[role="alert"]:hover, 
        div[role="status"]:hover,
        div[class*="toast" i]:hover,
        div[class*="Toast" i]:hover,
        div[data-testid*="toast" i]:hover {
          transform: translateY(-2px) scale(1.03) !important; /* Subtle tactile lift */
          border-radius: 9999px !important;
          border-color: rgba(255, 255, 255, 0.4) !important;
          background: rgba(32, 32, 32, 0.92) !important;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5), 
                      0 0 16px rgba(255, 255, 255, 0.1) !important; /* Soft outer glow */
        }

        /* Prevent Edge Clipping on parent containers */
        div:has(> div[role="alert"]),
        div:has(> div[role="status"]),
        div:has(> .toast-bar),
        div:has(> div[class*="toast" i]) {
          overflow: visible !important;
        }

        body, html { 
          background-color: #000000 !important; 
        }
      \`;
      (document.head || document.documentElement).appendChild(style);
    }
  })();
  true;
`;

const INJECTED_JAVASCRIPT = `
  (function() {
    // 1. Safe Non-Destructive DOM Cleaner Function
    window.__anchorClean = function() {
      try {
        // Target ONLY elements at the very bottom with small bar height (35px - 65px)
        var candidates = document.querySelectorAll('nav, footer, div');
        for (var i = 0; i < candidates.length; i++) {
          var el = candidates[i];
          if (el.closest('header')) continue;
          if (el.tagName === 'MAIN' || el.getAttribute('role') === 'main') continue;

          var h = el.offsetHeight;
          if (h >= 35 && h <= 65) {
            var rect = el.getBoundingClientRect();
            if (rect.bottom >= (window.innerHeight - 15) && rect.top > 100) {
              if (el.querySelector('a[href="/"], svg[aria-label*="Home" i], svg[aria-label*="Search" i], a[href*="/explore/"]')) {
                el.style.setProperty('display', 'none', 'important');
                el.style.setProperty('visibility', 'hidden', 'important');
                el.style.setProperty('height', '0px', 'important');
                el.style.setProperty('pointer-events', 'none', 'important');
              }
            }
          }
        }

        // Hide Threads promotional buttons in header
        var threads = document.querySelectorAll('a[href*="threads.net"], svg[aria-label*="Threads" i]');
        for (var t = 0; t < threads.length; t++) {
          var tBtn = threads[t].closest('a, button, div[role="button"]') || threads[t];
          tBtn.style.setProperty('display', 'none', 'important');
        }

        // Hide Camera/Story button in header
        var camera = document.querySelectorAll('header a[href*="/stories/create"], header svg[aria-label*="Camera" i], header svg[aria-label*="Story" i]');
        for (var c = 0; c < camera.length; c++) {
          var cBtn = camera[c].closest('a, button, div[role="button"]') || camera[c];
          cBtn.style.setProperty('display', 'none', 'important');
        }
      } catch(err) {}
    };

    // Run immediately and periodically
    window.__anchorClean();
    setInterval(window.__anchorClean, 400);

    // MutationObserver to catch dynamically rendered elements
    var observer = new MutationObserver(function() {
      window.__anchorClean();
    });
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', function() {
        observer.observe(document.body, { childList: true, subtree: true });
      });
    }

    // 2. Detect logged-in username for instant Profile tab navigation
    function detectUser() {
      if (window.__ANCHOR_USER__) return;
      try {
        var link = document.querySelector('a[href^="/"][role="link"]:has(img[alt*="profile picture" i])') ||
                   document.querySelector('a[href^="/"]:has(img[alt*="profile picture" i])');
        if (link) {
          var u = (link.getAttribute('href') || '').replace(/\\//g, '').split('?')[0];
          if (u && !['explore', 'reels', 'direct', 'stories'].includes(u)) {
            window.__ANCHOR_USER__ = u;
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOGGED_IN_USER', username: u }));
            }
          }
        }
      } catch(e) {}
    }

    detectUser();
    setInterval(detectUser, 1500);

    // 3. Fast direct tab router helper callable from native
    window.__anchorRoute = function(destination) {
      if (destination === 'activity') {
        var heart = document.querySelector('svg[aria-label*="Activity" i], svg[aria-label*="Notification" i], a[href*="/activity"]');
        var btn = heart ? heart.closest('a, button, div[role="button"]') : null;
        if (btn) {
          btn.click();
        } else {
          window.location.href = 'https://www.instagram.com/?activity=1';
        }
      } else if (destination === 'messages') {
        if (!window.location.pathname.includes('/direct/')) {
          window.location.href = 'https://www.instagram.com/direct/inbox/';
        }
      } else if (destination === 'profile') {
        if (window.__ANCHOR_USER__) {
          window.location.href = 'https://www.instagram.com/' + window.__ANCHOR_USER__ + '/';
        } else {
          var avatar = document.querySelector('img[alt*="profile picture" i]');
          var aLink = avatar ? avatar.closest('a') : null;
          if (aLink) aLink.click();
          else window.location.href = 'https://www.instagram.com/accounts/edit/';
        }
      } else if (destination === 'settings') {
        window.location.href = 'https://www.instagram.com/accounts/settings/';
      }
    };
  })();
  true;
`;

// Clean SVG Icons with Active / Inactive states
const ActivityIcon = ({ active }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    {active ? (
      <Path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill="#ffffff"
      />
    ) : (
      <Path
        d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938m0-2a6.04 6.04 0 0 0-4.797 2.127 6.052 6.052 0 0 0-4.787-2.127A6.985 6.985 0 0 0 .5 9.122c0 3.61 2.55 5.827 5.015 7.97.283.246.569.494.853.747l1.027.918a44.998 44.998 0 0 0 3.518 3.018 2 2 0 0 0 2.174 0 45.263 45.263 0 0 0 3.626-3.115l.922-.824c.293-.26.59-.519.885-.774 2.334-2.025 4.98-4.32 4.98-7.94a6.985 6.985 0 0 0-6.708-7.218Z"
        fill="#8e8e93"
      />
    )}
  </Svg>
);

const MessagesIcon = ({ active }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    {active ? (
      <Path
        d="M12 2C6.477 2 2 6.145 2 11.258c0 2.914 1.455 5.518 3.734 7.207V22l3.41-1.872c.915.253 1.884.39 2.856.39 5.523 0 10-4.145 10-9.258C22 6.145 17.523 2 12 2zm1.066 12.443l-2.583-2.756-5.044 2.756 5.547-5.889 2.65 2.756 4.977-2.756-5.547 5.889z"
        fill="#ffffff"
      />
    ) : (
      <Path
        d="M12 2.5C6.753 2.5 2.5 6.438 2.5 11.258c0 2.722 1.348 5.167 3.479 6.764l-.538 3.023a.75.75 0 001.077.787l3.665-1.782c.594.137 1.205.208 1.817.208 5.247 0 9.5-3.938 9.5-8.758C21.5 6.438 17.247 2.5 12 2.5zm0 1.5c4.418 0 8 3.243 8 7.258 0 4.015-3.582 7.258-8 7.258-.553 0-1.107-.06-1.642-.18l-.348-.078-2.582 1.255.378-2.126-.183-.243C5.97 18.064 4.5 15.918 4.5 11.258c0-4.015 3.582-7.258 8-7.258zm1.066 10.943l-2.583-2.756-5.044 2.756 5.547-5.889 2.65 2.756 4.977-2.756-5.547 5.889z"
        fill="#8e8e93"
      />
    )}
  </Svg>
);

const ProfileIcon = ({ active }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9.5" stroke={active ? '#ffffff' : '#8e8e93'} strokeWidth={active ? 2 : 1.7} />
    <Circle cx="12" cy="9.5" r="3" fill={active ? '#ffffff' : '#8e8e93'} />
    <Path d="M7 17.5c1-2.2 2.8-3.1 5-3.1s4 0.9 5 3.1" stroke={active ? '#ffffff' : '#8e8e93'} strokeWidth={1.7} strokeLinecap="round" fill="none" />
  </Svg>
);

const SettingsIcon = ({ active }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84a.484.484 0 00-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 00-.59.22L2.74 8.87a.49.49 0 00.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 00-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
      fill={active ? '#ffffff' : '#8e8e93'}
    />
  </Svg>
);

const TABS = [
  { id: 'activity', label: 'Activity', Icon: ActivityIcon },
  { id: 'messages', label: 'Messages', Icon: MessagesIcon },
  { id: 'profile', label: 'Profile', Icon: ProfileIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
];

const getTabIndex = (tabId) => {
  switch (tabId) {
    case 'activity': return 0;
    case 'messages': return 1;
    case 'profile': return 2;
    case 'settings': return 3;
    default: return 1;
  }
};

function MainScreen() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef(null);
  const [activeTab, setActiveTab] = useState('messages');
  const [innerWidth, setInnerWidth] = useState(0);
  const slideAnim = useRef(new Animated.Value(1)).current;
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [canGoBack, setCanGoBack] = useState(false);

  // Instant Android Back Button Navigation
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [canGoBack]);

  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'LOGGED_IN_USER' && data.username) {
        setLoggedInUser(data.username);
      }
    } catch(e) {}
  };

  const handleTabPress = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);

    const targetIndex = getTabIndex(tab);
    Animated.spring(slideAnim, {
      toValue: targetIndex,
      stiffness: 280,
      damping: 26,
      mass: 0.8,
      useNativeDriver: true,
    }).start();

    if (!webViewRef.current) return;

    // Use fast in-page router helper with fallback
    if (tab === 'profile' && loggedInUser) {
      webViewRef.current.injectJavaScript(`window.location.href = 'https://www.instagram.com/${loggedInUser}/'; true;`);
    } else {
      webViewRef.current.injectJavaScript(`
        if (typeof window.__anchorRoute === 'function') {
          window.__anchorRoute('${tab}');
        } else {
          ${tab === 'activity' ? "window.location.href = 'https://www.instagram.com/?activity=1';" : ''}
          ${tab === 'messages' ? "window.location.href = 'https://www.instagram.com/direct/inbox/';" : ''}
          ${tab === 'settings' ? "window.location.href = 'https://www.instagram.com/accounts/settings/';" : ''}
        }
        true;
      `);
    }
  };

  const topPadding = insets.top;

  const tabWidth = innerWidth > 0 ? innerWidth / 4 : 0;
  const pillWidth = tabWidth > 0 ? tabWidth - 4 : 0;

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, tabWidth, tabWidth * 2, tabWidth * 3],
  });

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#080808" barStyle="light-content" translucent={true} />

      {/* Modern Slim Top Header */}
      <View style={[styles.topHeader, { paddingTop: topPadding, height: 46 + topPadding }]}>
        <View style={styles.titleGroup}>
          <Text style={styles.brandTitle}>⚓ Anchor</Text>
          <View style={styles.focusedBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.badgeText}>Focused</Text>
          </View>
        </View>
      </View>

      {/* Clean, Non-crashing WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://www.instagram.com/direct/inbox/' }}
        style={styles.webview}
        domStorageEnabled={true}
        javaScriptEnabled={true}
        mixedContentMode="always"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        scalesPageToFit={false}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        userAgent="Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
        allowsBackForwardNavigationGestures={true}
        injectedJavaScriptBeforeContentLoaded={INJECTED_CSS_AND_PRELOAD}
        injectedJavaScript={INJECTED_JAVASCRIPT}
        onNavigationStateChange={(navState) => {
          if (navState.canGoBack !== canGoBack) {
            setCanGoBack(navState.canGoBack);
          }
        }}
        onLoadEnd={() => {
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`
              if (typeof window.__anchorClean === 'function') {
                window.__anchorClean();
              }
              true;
            `);
          }
        }}
        onMessage={onMessage}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#ffffff" />
          </View>
        )}
      />

      {/* Ultra-Clean Floating Native Pill Navigation Bar with Smooth Sliding Glass Indicator */}
      <View style={[styles.bottomBarContainer, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
        <View
          style={styles.barInner}
          onLayout={(e) => setInnerWidth(e.nativeEvent.layout.width)}
        >
          {/* Continuous Gliding Frosted Glass Pill Indicator */}
          {tabWidth > 0 && (
            <Animated.View
              style={[
                styles.slidingIndicator,
                {
                  width: pillWidth,
                  transform: [{ translateX }],
                },
              ]}
            />
          )}

          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.Icon;
            return (
              <Pressable
                key={tab.id}
                style={styles.tabButton}
                delayPressIn={0}
                onPress={() => handleTabPress(tab.id)}
              >
                {({ pressed }) => (
                  <View style={[styles.tabContent, pressed && styles.tabContentPressed]}>
                    <TabIcon active={isActive} />
                    <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                      {tab.label}
                    </Text>
                  </View>
                )}
              </Pressable>
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
            <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Reload App</Text>
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
        <MainScreen />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topHeader: {
    backgroundColor: '#0a0a0e',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  focusedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 185, 129, 0.12)',
    borderColor: 'rgba(15, 185, 129, 0.35)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 5,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#0fb981',
  },
  badgeText: {
    color: '#0fb981',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
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
  bottomBarContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 60,
    backgroundColor: 'rgba(22, 22, 28, 0.88)', // Sleek dark glass surface
    borderRadius: 9999, // Continuous capsule pill curve
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.20)', // Glowing translucent specular border
    padding: 4, // Exactly uniform 4px on top, bottom, left, right!
    overflow: 'visible',
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
  },
  barInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    position: 'relative',
    overflow: 'visible',
  },
  slidingIndicator: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 2,
    borderRadius: 9999, // Pill capsule matching the toast bar
    backgroundColor: 'rgba(255, 255, 255, 0.16)', // Frosted glass indicator
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)', // Curvy glass glowing border
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 }, // Symmetrical glow, no downward displacement!
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 1,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    zIndex: 2,
    overflow: 'visible',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContentPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.85,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#8e8e93',
    marginTop: 2,
    letterSpacing: -0.1,
    includeFontPadding: false, // Prevents Android font vertical skew
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
