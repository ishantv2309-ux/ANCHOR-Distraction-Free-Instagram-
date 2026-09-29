import React, { useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, StatusBar, Platform, View, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';

const INJECTED_JAVASCRIPT = `
  (function() {
    // Dynamic Profile Navigation Helper attached to window
    window.navigateToSelfProfile = function() {
      // Method 1: Check viewer username in Instagram's data stores
      if (window._sharedData && window._sharedData.config && window._sharedData.config.viewer && window._sharedData.config.viewer.username) {
        window.location.href = 'https://www.instagram.com/' + window._sharedData.config.viewer.username + '/';
        return;
      }
      if (window.__initialData && window.__initialData.data && window.__initialData.data.viewer && window.__initialData.data.viewer.username) {
        window.location.href = 'https://www.instagram.com/' + window.__initialData.data.viewer.username + '/';
        return;
      }
      // Method 2: Get profile link from Instagram's web header/avatar DOM element
      const profileLink = document.querySelector('a[href*="/accounts/edit/"]') || 
                          document.querySelector('a[href^="/"][role="link"] img')?.closest('a') ||
                          document.querySelector('a[aria-label*="Profile" i]');
      
      if (profileLink && profileLink.href) {
        window.location.href = profileLink.href;
      } else {
        // Fallback: Default directly to Instagram edit/accounts entry point which redirects to self
        window.location.href = 'https://www.instagram.com/accounts/edit/';
      }
    };

    // 1. Inject CSS rules once to handle element hiding without CPU-heavy loops
    if (!document.getElementById('anchor-focus-styles')) {
      const style = document.createElement('style');
      style.id = 'anchor-focus-styles';
      style.innerHTML = \`
        /* Hide Reels & Explore navigation everywhere */
        a[href*="/reels/"], 
        a[href*="/explore/"], 
        a[aria-label*="Reels"], 
        a[aria-label*="Explore"],
        svg[aria-label="Reels"],
        svg[aria-label="Explore"],
        div[data-testid="reels-tab"],
        div[data-testid="explore-tab"],
        /* Hide Home feed triggers */
        a[href="/"] svg[aria-label*="Home" i],
        /* Hide residual bottom bars and toastbars via pure CSS */
        nav,
        footer,
        [role="tablist"],
        [role="navigation"],
        div[style*="bottom: 0"],
        div[style*="bottom:0"],
        div[style*="bottom: 0px"],
        div[style*="bottom:0px"],
        /* Eradicate Use the app banner, app download prompts, and bottom upsell cards */
        div[data-testid*="app-upsell"],
        div[data-testid*="open-in-app"],
        div[role="banner"],
        div:has(> * > a[href*="download"]),
        div:has(> a[href*="download"]),
        a[href*="instagram.com/download"],
        a[href*="play.google.com"],
        a[href*="apps.apple.com"] {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
          height: 0 !important;
        }
      \`;
      (document.head || document.documentElement).appendChild(style);
    }

    // 2. Redirect base home path straight to Direct Messages inbox
    function enforceInboxRoute() {
      const path = window.location.pathname;
      if (path === '/' || path === '/#' || path === '' || path.startsWith('/reels') || path.startsWith('/explore')) {
        window.location.replace('https://www.instagram.com/direct/inbox/');
      }
    }

    enforceInboxRoute();

    // 3. Lightweight MutationObserver runs only when DOM mutates, eliminating touch delay
    const observer = new MutationObserver(() => {
      enforceInboxRoute();
    });

    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  })();
  true;
`;

export default function App() {
  const webViewRef = useRef(null);
  const [activeTab, setActiveTab] = useState('messages');

  const handleTabPress = (tab) => {
    setActiveTab(tab);
    if (!webViewRef.current) return;

    if (tab === 'activity') {
      webViewRef.current.injectJavaScript(`
        if (!window.location.pathname.includes('/activity')) {
          window.location.href = 'https://www.instagram.com/accounts/activity/';
        }
        true;
      `);
    } else if (tab === 'messages') {
      webViewRef.current.injectJavaScript(`
        if (window.location.pathname !== '/direct/inbox/') {
          window.location.href = 'https://www.instagram.com/direct/inbox/';
        }
        true;
      `);
    } else if (tab === 'profile') {
      webViewRef.current.injectJavaScript(`
        window.location.href = 'https://www.instagram.com/jack_98472/';
        true;
      `);
    } else if (tab === 'settings') {
      webViewRef.current.injectJavaScript(`
        if (!window.location.pathname.includes('/settings')) {
          window.location.href = 'https://www.instagram.com/accounts/settings/';
        }
        true;
      `);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#000000" barStyle="light-content" />
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
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
        injectedJavaScript={INJECTED_JAVASCRIPT}
      />
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.tabButton} delayPressIn={0} onPress={() => handleTabPress('activity')}>
          <Text style={[styles.tabIcon, activeTab === 'activity' && styles.tabActive]}>🔔</Text>
          <Text style={[styles.tabLabel, activeTab === 'activity' && styles.tabActive]}>Activity</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton} delayPressIn={0} onPress={() => handleTabPress('messages')}>
          <Text style={[styles.tabIcon, activeTab === 'messages' && styles.tabActive]}>💬</Text>
          <Text style={[styles.tabLabel, activeTab === 'messages' && styles.tabActive]}>Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton} delayPressIn={0} onPress={() => handleTabPress('profile')}>
          <Text style={[styles.tabIcon, activeTab === 'profile' && styles.tabActive]}>👤</Text>
          <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabActive]}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton} delayPressIn={0} onPress={() => handleTabPress('settings')}>
          <Text style={[styles.tabIcon, activeTab === 'settings' && styles.tabActive]}>⚙️</Text>
          <Text style={[styles.tabLabel, activeTab === 'settings' && styles.tabActive]}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  bottomNav: {
    flexDirection: 'row',
    height: 56,
    backgroundColor: '#080808',
    borderTopWidth: 1,
    borderTopColor: '#1c1c1e',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabIcon: {
    fontSize: 18,
    color: '#8e8e93',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8e8e93',
    marginTop: 2,
  },
  tabActive: {
    color: '#ffffff',
  },
});
