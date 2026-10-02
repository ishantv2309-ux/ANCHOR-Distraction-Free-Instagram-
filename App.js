import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, StatusBar, View, Text, TouchableOpacity, BackHandler, Platform, ActivityIndicator } from 'react-native';
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

        /* 2. Eradicate Instagram Mobile Web Bottom Bar & Toast Notifications */
        div[role="tablist"]:not(:has(svg[aria-label*="Posts" i])),
        footer[role="contentinfo"],
        div[data-testid="bottom-nav"],
        div[data-testid="mobile-nav-bar"],
        div[data-testid="tab-bar"],
        div[data-testid="bottom_bar"],
        div[role="alert"],
        div[role="status"],
        div[class*="toast" i],
        div[class*="Toast" i],
        div[data-testid*="toast" i],
        div[data-testid*="app-upsell"],
        div[data-testid*="open-in-app"] {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
          height: 0 !important;
          max-height: 0 !important;
          overflow: hidden !important;
        }

        /* 3. Fast crisp header */
        header[role="banner"] {
          background-color: rgba(10, 10, 14, 0.95) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        body, html { 
          background-color: #000000 !important; 
        }

        /* Reserve bottom space so page content is never obscured by the bottom bar */
        main, section, div[role="main"] {
          padding-bottom: 72px !important;
        }
      \`;
      (document.head || document.documentElement).appendChild(style);
    }
  })();
  true;
`;

const INJECTED_JAVASCRIPT = `
  (function() {
    // Detect logged-in username for instant Profile tab navigation
    function detectUser() {
      if (window.__ANCHOR_USER__) return;
      try {
        const link = document.querySelector('a[href^="/"][role="link"]:has(img[alt*="profile picture" i])') ||
                     document.querySelector('a[href^="/"]:has(img[alt*="profile picture" i])');
        if (link) {
          const u = (link.getAttribute('href') || '').replace(/\\//g, '').split('?')[0];
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

    // Fast direct tab router helper callable from native
    window.__anchorRoute = function(destination) {
      if (destination === 'activity') {
        const heart = document.querySelector('svg[aria-label*="Activity" i], svg[aria-label*="Notification" i], a[href*="/activity"]')?.closest('a, button, div[role="button"]');
        if (heart) {
          heart.click();
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
          const avatar = document.querySelector('img[alt*="profile picture" i]')?.closest('a');
          if (avatar) avatar.click();
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

function MainScreen() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef(null);
  const [activeTab, setActiveTab] = useState('messages');
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

      {/* Hardware-Accelerated High-Performance WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://www.instagram.com/direct/inbox/' }}
        style={styles.webview}
        androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
        renderToHardwareTextureAndroid={Platform.OS === 'android'}
        cacheEnabled={true}
        cacheMode="LOAD_DEFAULT"
        domStorageEnabled={true}
        databaseEnabled={true}
        javaScriptEnabled={true}
        pullToRefreshEnabled={true}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        scalesPageToFit={false}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsBackForwardNavigationGestures={true}
        injectedJavaScriptBeforeContentLoaded={INJECTED_CSS_AND_PRELOAD}
        injectedJavaScript={INJECTED_JAVASCRIPT}
        onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
        onMessage={onMessage}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#ffffff" />
          </View>
        )}
      />

      {/* Ultra-Clean Floating Native Navigation Bar */}
      <View style={[styles.bottomBarContainer, { bottom: Math.max(insets.bottom, 12) + 6 }]}>
        <TouchableOpacity
          style={styles.tabButton}
          activeOpacity={0.65}
          delayPressIn={0}
          onPress={() => handleTabPress('activity')}
        >
          <View style={[styles.tabContent, activeTab === 'activity' && styles.tabContentActive]}>
            <ActivityIcon active={activeTab === 'activity'} />
            <Text style={[styles.tabLabel, activeTab === 'activity' && styles.tabLabelActive]}>Activity</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          activeOpacity={0.65}
          delayPressIn={0}
          onPress={() => handleTabPress('messages')}
        >
          <View style={[styles.tabContent, activeTab === 'messages' && styles.tabContentActive]}>
            <MessagesIcon active={activeTab === 'messages'} />
            <Text style={[styles.tabLabel, activeTab === 'messages' && styles.tabLabelActive]}>Messages</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          activeOpacity={0.65}
          delayPressIn={0}
          onPress={() => handleTabPress('profile')}
        >
          <View style={[styles.tabContent, activeTab === 'profile' && styles.tabContentActive]}>
            <ProfileIcon active={activeTab === 'profile'} />
            <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>Profile</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          activeOpacity={0.65}
          delayPressIn={0}
          onPress={() => handleTabPress('settings')}
        >
          <View style={[styles.tabContent, activeTab === 'settings' && styles.tabContentActive]}>
            <SettingsIcon active={activeTab === 'settings'} />
            <Text style={[styles.tabLabel, activeTab === 'settings' && styles.tabLabelActive]}>Settings</Text>
          </View>
        </TouchableOpacity>
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
    left: 18,
    right: 18,
    height: 60,
    backgroundColor: '#121216',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 6,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  tabContentActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#8e8e93',
    marginTop: 2,
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
