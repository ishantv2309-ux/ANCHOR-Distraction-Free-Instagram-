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

const USER_AGENT = Platform.OS === 'ios'
  ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
  : 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

// Lightweight pre-load script: syncs theme cookies & mocks matchMedia before React mounts
const getInitJS = (isDark) => `
  (function() {
    var themeMode = ${isDark ? "'dark'" : "'light'"};
    try {
      document.cookie = "theme=" + themeMode + "; path=/; max-age=31536000; domain=.instagram.com";
      document.cookie = "theme=" + themeMode + "; path=/; max-age=31536000";
    } catch(e) {}

    // Mock matchMedia so Meta/Comet initializes native dark components
    try {
      var origMatch = window.matchMedia;
      window.matchMedia = function(q) {
        if (q && q.indexOf('prefers-color-scheme') !== -1) {
          var isQDark = q.indexOf('dark') !== -1;
          var matches = ${isDark} ? isQDark : !isQDark;
          return {
            matches: matches,
            media: q,
            onchange: null,
            addListener: function() {},
            removeListener: function() {},
            addEventListener: function() {},
            removeEventListener: function() {},
            dispatchEvent: function() { return false; },
          };
        }
        return origMatch ? origMatch.apply(this, arguments) : { matches: false, media: q };
      };
    } catch(e) {}
  })();
  true;
`;

// Post-load injection: Anti-distraction, crisp white text, complete eradication of Instagram's bottom bar
const getInjectedJS = (isDark) => `
  (function() {
    var isDarkMode = ${isDark};
    var themeMode = isDarkMode ? 'dark' : 'light';
    var themeClass = isDarkMode ? '__ig-dark-mode' : '__ig-light-mode';

    // 1. Sync theme cookies
    try {
      document.cookie = "theme=" + themeMode + "; path=/; max-age=31536000; domain=.instagram.com";
      document.cookie = "theme=" + themeMode + "; path=/; max-age=31536000";
    } catch(e) {}

    // 2. Set native Instagram theme class and color scheme
    if (document.documentElement) {
      document.documentElement.classList.remove('__ig-dark-mode', '__ig-light-mode', 'dark', 'light');
      document.documentElement.classList.add(themeClass, themeMode);
      document.documentElement.style.setProperty('color-scheme', themeMode);
    }

    // 3. Inject safe, pristine CSS overrides
    var styleId = 'anchor-native-shield';
    var existingStyle = document.getElementById(styleId);
    if (!existingStyle) {
      var style = document.createElement('style');
      style.id = styleId;
      style.textContent = \`
        /* Root container background */
        html, body {
          background-color: \${isDarkMode ? '#000000' : '#FFFFFF'} !important;
        }

        /* Remove artificial wireframe box outlines */
        * {
          outline: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }

        /* Set Instagram CSS variables for dark/light themes */
        :root, html, body, .__ig-dark-mode {
          color-scheme: \${themeMode} !important;
          --primary-background: \${isDarkMode ? '#000000' : '#FFFFFF'} !important;
          --ig-primary-background: \${isDarkMode ? '0, 0, 0' : '255, 255, 255'} !important;
          --secondary-background: \${isDarkMode ? '#1c1c1e' : '#FAFAFA'} !important;
          --ig-secondary-background: \${isDarkMode ? '28, 28, 30' : '245, 245, 245'} !important;
          --ig-elevated-background: \${isDarkMode ? '38, 38, 42' : '255, 255, 255'} !important;
          --ig-highlight-background: \${isDarkMode ? '38, 38, 42' : '245, 245, 245'} !important;
          --card-background: \${isDarkMode ? '#1c1c1e' : '#FFFFFF'} !important;
          --primary-text: \${isDarkMode ? '#FFFFFF' : '#000000'} !important;
          --ig-primary-text: \${isDarkMode ? '255, 255, 255' : '0, 0, 0'} !important;
          --ig-secondary-text: \${isDarkMode ? '168, 168, 168' : '115, 115, 115'} !important;
          --ig-colors-link-text: \${isDarkMode ? '255, 255, 255' : '0, 0, 0'} !important;
          --ig-link: \${isDarkMode ? '255, 255, 255' : '0, 0, 0'} !important;
          --link: \${isDarkMode ? '#FFFFFF' : '#000000'} !important;
        }

        /* Crisp High-Contrast White Text in Dark Mode (Eliminates dark blue text) */
        \${isDarkMode ? \`
          /* Menu item links and row text */
          a,
          a:visited,
          a:hover,
          a:active,
          a span,
          a div,
          div[role="list"] a,
          div[role="list"] a span,
          div[role="list"] a div,
          div[role="menuitem"],
          div[role="menuitem"] span,
          div[role="button"] span {
            color: #FFFFFF !important;
          }

          /* Secondary descriptions in menus */
          div[role="list"] a span:last-child,
          a span > span,
          a p {
            color: #A8A8A8 !important;
          }

          /* Section titles in Settings */
          h1, h2, h3, h4,
          div[role="heading"],
          header h1, header h2, header span {
            color: #FFFFFF !important;
          }

          /* Menu icons & SVGs in links */
          a svg,
          div[role="list"] svg,
          button svg,
          div[role="button"] svg {
            color: #FFFFFF !important;
          }
          a svg [stroke],
          div[role="list"] svg [stroke] {
            stroke: #FFFFFF !important;
          }
          a svg [fill]:not([fill="none"]),
          div[role="list"] svg [fill]:not([fill="none"]) {
            fill: #FFFFFF !important;
          }

          /* Fix white surface on Search Bar */
          input, input[type="text"], input[type="search"], div[role="search"] input {
            background-color: #262626 !important;
            color: #FFFFFF !important;
            border-color: #383838 !important;
          }
          input::placeholder {
            color: #8E8E93 !important;
          }

          /* Fix white surface on "Your note" popover speech bubble and dialogs */
          div[role="tooltip"],
          div[data-popover="true"],
          div[role="dialog"] div[style*="background"],
          div:has(> span:contains("note")),
          div[style*="border-radius: 18px"],
          div[style*="border-radius: 20px"] {
            background-color: #262626 !important;
            color: #FFFFFF !important;
          }

          /* Invert stray white backgrounds on popovers & cards */
          div[style*="background-color: rgb(255, 255, 255)"],
          div[style*="background-color: rgb(250, 250, 250)"],
          div[style*="background-color: #ffffff"],
          div[style*="background-color: #FAFAFA"],
          div[style*="background: rgb(255, 255, 255)"],
          div[style*="background: #ffffff"] {
            background-color: #262626 !important;
            color: #FFFFFF !important;
          }
        \` : \`
          a, a span {
            color: #000000 !important;
          }
          a svg, div[role="list"] svg {
            color: #000000 !important;
          }
        \`}

        /* Distraction-Free: Hide Reels and Explore tabs */
        a[href*="/reels/"],
        a[href^="/reels/"],
        svg[aria-label*="Reels" i],
        svg[aria-label*="Clips" i],
        a[href*="/explore/"],
        a[href^="/explore/"],
        svg[aria-label*="Explore" i] {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }

        /* Permanently Hide Instagram's Original Bottom Navigation Bar via CSS */
        footer {
          display: none !important;
          visibility: hidden !important;
          height: 0px !important;
          pointer-events: none !important;
        }

        /* Clean Profile: Hide Saved / Bookmark tab */
        a[href*="/saved/"],
        svg[aria-label="Saved"],
        svg[aria-label*="Saved" i],
        div[role="tab"]:has(svg[aria-label*="Saved" i]) {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }

        /* Permanently Hide all "Use the app" sticky bottom banners & install prompts */
        .smartbanner,
        [aria-label*="Use the app" i],
        [aria-label*="Get the app" i],
        [aria-label*="Open in app" i],
        a[href*="itunes.apple.com"],
        a[href*="play.google.com"],
        a[href*="instagram://"],
        div[data-testid*="app-upsell"],
        div[data-testid*="smart-banner"],
        div[data-testid*="open-in-app"] {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
          height: 0 !important;
          max-height: 0 !important;
          overflow: hidden !important;
          opacity: 0 !important;
        }

        /* Safe bottom scrolling clearance on main container */
        main[role="main"], main {
          padding-bottom: 74px !important;
        }

        /* Kill vertical scroll snap on Reel screens */
        html, body, main, section, div[role="dialog"], div[aria-modal="true"] {
          overscroll-behavior-y: none !important;
          scroll-snap-type: none !important;
        }
      \`;
      (document.head || document.documentElement).appendChild(style);
    }

    // 4. PRECISE ERADICATION OF INSTAGRAM'S ORIGINAL BOTTOM BAR
    function eradicateInstagramBottomBar() {
      var isDirectInbox = (window.location.pathname || '').indexOf('/direct') !== -1;
      var winH = window.innerHeight || 800;

      // Direct hide footer
      var footers = document.querySelectorAll('footer');
      for (var f = 0; f < footers.length; f++) {
        footers[f].style.setProperty('display', 'none', 'important');
      }

      // If we are in Direct inbox/chat, do NOT touch any message threads or containers
      if (isDirectInbox) return;

      // Method 1: Target Home link icon in the bottom bar (never top header)
      var homeLinks = document.querySelectorAll('a[href="/"], a[href="/?variant=home"], svg[aria-label*="Home" i]');
      for (var h = 0; h < homeLinks.length; h++) {
        var hl = homeLinks[h];
        var hlR = hl.getBoundingClientRect();
        if (hlR.top > winH - 90 && hlR.top > 200) {
          hl.style.setProperty('display', 'none', 'important');
          var curr = hl.parentElement;
          while (curr && curr !== document.body && curr !== document.documentElement && curr.tagName !== 'MAIN' && curr.id !== 'react-root') {
            var st = window.getComputedStyle(curr);
            var r = curr.getBoundingClientRect();
            if ((st.position === 'fixed' || st.position === 'sticky') && r.top > winH - 90) {
              curr.style.setProperty('display', 'none', 'important');
              curr.style.setProperty('height', '0px', 'important');
              curr.style.setProperty('pointer-events', 'none', 'important');
              break;
            }
            curr = curr.parentElement;
          }
        }
      }

      // Method 2: Target bottom avatar icon and walk up
      var avatars = document.querySelectorAll('img[alt*="profile picture" i], img[alt*="profile" i]');
      for (var i = 0; i < avatars.length; i++) {
        var img = avatars[i];
        var imgR = img.getBoundingClientRect();
        // The bottom bar avatar is tiny (< 36px) and located in the bottom 90px
        if (imgR.height > 15 && imgR.height < 36 && imgR.top > winH - 90) {
          var cur = img.parentElement;
          while (cur && cur !== document.body && cur !== document.documentElement && cur.tagName !== 'MAIN' && cur.id !== 'react-root') {
            var comp = window.getComputedStyle(cur);
            var curR = cur.getBoundingClientRect();
            if ((comp.position === 'fixed' || comp.position === 'sticky') && curR.top > winH - 90) {
              cur.style.setProperty('display', 'none', 'important');
              cur.style.setProperty('height', '0px', 'important');
              cur.style.setProperty('pointer-events', 'none', 'important');
              break;
            }
            cur = cur.parentElement;
          }
        }
      }
    }
    eradicateInstagramBottomBar();
    setInterval(eradicateInstagramBottomBar, 300);

    // 5. Active banner purger: Permanently removes "Use the app" sticky prompt bar
    function purgeAppPrompts() {
      var allBanners = document.querySelectorAll('a, button, span, div, p');
      for (var i = 0; i < allBanners.length; i++) {
        var el = allBanners[i];
        var text = (el.textContent || '').trim().toLowerCase();
        if (text === 'use the app' || text === 'open in app' || text === 'get the app') {
          var container = el.closest('div[style*="fixed"], div[style*="sticky"], div[role="banner"]') || el.parentElement;
          if (container && container !== document.body && container !== document.documentElement && container.tagName !== 'MAIN') {
            container.style.setProperty('display', 'none', 'important');
            container.style.setProperty('visibility', 'hidden', 'important');
            container.style.setProperty('height', '0px', 'important');
            container.style.setProperty('pointer-events', 'none', 'important');
          }
        }
      }
    }
    purgeAppPrompts();
    setInterval(purgeAppPrompts, 800);

    // 6. Block Global Reels Feed & Algorithmic Feeds
    function blockGlobalFeed() {
      var p = (window.location.pathname || '').toLowerCase();
      if (p === '/reels/' || p === '/reels' || p.startsWith('/explore')) {
        window.location.replace('https://www.instagram.com/direct/inbox/');
      }
    }
    blockGlobalFeed();
    setInterval(blockGlobalFeed, 800);

    // 7. Strict Single-Reel Playback & Touch Interceptor Engine
    function isReelPage() {
      var p = (window.location.pathname || '').toLowerCase();
      if (p.indexOf('/reel/') !== -1 || p.indexOf('/reels/') !== -1 || p.startsWith('/reel') || p.startsWith('/p/')) {
        return true;
      }
      if (document.querySelector('div[role="dialog"] video, div[aria-modal="true"] video, section video')) {
        return true;
      }
      return false;
    }

    function extractReelId(url) {
      if (!url) return null;
      var m = url.toString().match(/\\/(reels?|p)\\/([A-Za-z0-9_-]+)/i);
      return m ? m[2] : null;
    }

    var lockedReelId = extractReelId(window.location.pathname);

    // Clean overlay modal when user attempts to scroll to subsequent Reels
    function showFocusOverlay() {
      var existing = document.getElementById('anchor-focus-overlay');
      if (existing) {
        existing.style.display = 'flex';
        return;
      }

      var overlay = document.createElement('div');
      overlay.id = 'anchor-focus-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);padding:24px;box-sizing:border-box;';

      overlay.innerHTML = \`
        <div style="background:rgba(28,28,32,0.96);border:1px solid rgba(255,255,255,0.15);border-radius:24px;padding:26px 22px;max-width:320px;width:100%;text-align:center;box-shadow:0 16px 40px rgba(0,0,0,0.6);font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
          <div style="width:48px;height:48px;border-radius:24px;background:rgba(52,199,89,0.15);border:1px solid rgba(52,199,89,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:22px;">
            ⚓
          </div>
          <h3 style="color:#ffffff;font-size:17px;font-weight:700;margin:0 0 8px;letter-spacing:-0.2px;">
            Focus Mode Active
          </h3>
          <p style="color:rgba(255,255,255,0.8);font-size:14px;line-height:20px;margin:0 0 22px;">
            Scrolling to the next Reel is disabled.
          </p>
          <button id="anchor-back-msgs-btn" style="width:100%;background:#0095F6;color:#ffffff;border:none;border-radius:22px;padding:12px 18px;font-size:14px;font-weight:600;cursor:pointer;margin-bottom:10px;-webkit-tap-highlight-color:transparent;">
            Back to Messages
          </button>
          <button id="anchor-dismiss-btn" style="width:100%;background:transparent;color:rgba(255,255,255,0.6);border:none;padding:8px;font-size:13px;cursor:pointer;-webkit-tap-highlight-color:transparent;">
            Keep Watching
          </button>
        </div>
      \`;

      (document.body || document.documentElement).appendChild(overlay);

      var backBtn = document.getElementById('anchor-back-msgs-btn');
      if (backBtn) {
        backBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          window.location.href = 'https://www.instagram.com/direct/inbox/';
        });
      }

      var dismissBtn = document.getElementById('anchor-dismiss-btn');
      if (dismissBtn) {
        dismissBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          overlay.style.display = 'none';
        });
      }

      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          overlay.style.display = 'none';
        }
      });
    }

    // Intercept Vertical Touch Gestures (Swipe Up / Swipe Down) on Reels
    var touchStartY = 0;
    var touchStartX = 0;
    var scrollTriggered = false;

    window.addEventListener('touchstart', function(e) {
      if (e.touches && e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
        scrollTriggered = false;
      }
    }, { capture: true, passive: true });

    window.addEventListener('touchmove', function(e) {
      if (!isReelPage()) return;
      if (e.touches && e.touches.length > 0) {
        var currentY = e.touches[0].clientY;
        var currentX = e.touches[0].clientX;
        var deltaY = Math.abs(currentY - touchStartY);
        var deltaX = Math.abs(currentX - touchStartX);

        if (deltaY > 12 && deltaY > deltaX) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          if (!scrollTriggered && deltaY > 20) {
            scrollTriggered = true;
            showFocusOverlay();
          }
          return false;
        }
      }
    }, { capture: true, passive: false });

    // Block mouse wheel / trackpad scrolling on Reels
    window.addEventListener('wheel', function(e) {
      if (!isReelPage()) return;
      if (Math.abs(e.deltaY) > 8) {
        e.preventDefault();
        e.stopPropagation();
        showFocusOverlay();
      }
    }, { capture: true, passive: false });

    // Block Arrow/Page scroll keys on Reels
    window.addEventListener('keydown', function(e) {
      if (!isReelPage()) return;
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '].indexOf(e.key) !== -1) {
        var tag = (e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '');
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
          e.stopPropagation();
          showFocusOverlay();
        }
      }
    }, { capture: true });

    // Intercept SPA navigation to subsequent Reels
    var origPushState = history.pushState;
    history.pushState = function(state, title, url) {
      if (url) {
        var urlStr = url.toString().toLowerCase();
        if (urlStr === '/reels/' || urlStr === '/reels' || urlStr.indexOf('/explore') !== -1) {
          window.location.replace('https://www.instagram.com/direct/inbox/');
          return;
        }
        var nextReelId = extractReelId(urlStr);
        if (nextReelId) {
          if (!lockedReelId) {
            lockedReelId = nextReelId;
          } else if (nextReelId !== lockedReelId) {
            showFocusOverlay();
            return;
          }
        }
      }
      return origPushState.apply(this, arguments);
    };

    var origReplaceState = history.replaceState;
    history.replaceState = function(state, title, url) {
      if (url) {
        var urlStr = url.toString().toLowerCase();
        if (urlStr === '/reels/' || urlStr === '/reels' || urlStr.indexOf('/explore') !== -1) {
          window.location.replace('https://www.instagram.com/direct/inbox/');
          return;
        }
        var nextReelId = extractReelId(urlStr);
        if (nextReelId) {
          if (!lockedReelId) {
            lockedReelId = nextReelId;
          } else if (nextReelId !== lockedReelId) {
            showFocusOverlay();
            return;
          }
        }
      }
      return origReplaceState.apply(this, arguments);
    };

    // 8. Robust Logged-In User Extraction
    function detectUser() {
      if (window.__ANCHOR_USER__) return;
      var ignored = ['explore', 'reels', 'direct', 'stories', 'accounts', 'messages', 'notifications', 'search', 'settings', 'p', 'reel'];

      try {
        if (window.location && window.location.pathname) {
          var p = window.location.pathname.replace(/^\\/+|\\/+$/g, '');
          if (p && p.indexOf('/') === -1 && /^[a-zA-Z0-9._]{1,30}$/.test(p) && ignored.indexOf(p.toLowerCase()) === -1) {
            window.__ANCHOR_USER__ = p;
            if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOGGED_IN_USER', username: p }));
            return;
          }
        }

        if (window._sharedData && window._sharedData.config && window._sharedData.config.viewer && window._sharedData.config.viewer.username) {
          var u = window._sharedData.config.viewer.username;
          if (u && ignored.indexOf(u.toLowerCase()) === -1) {
            window.__ANCHOR_USER__ = u;
            if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOGGED_IN_USER', username: u }));
            return;
          }
        }

        var meta = document.querySelector('meta[property="al:ios:url"]');
        if (meta && meta.content) {
          var parts = meta.content.split('user?username=');
          if (parts.length > 1 && parts[1]) {
            var u = parts[1].split('&')[0];
            if (u && ignored.indexOf(u.toLowerCase()) === -1) {
              window.__ANCHOR_USER__ = u;
              if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOGGED_IN_USER', username: u }));
              return;
            }
          }
        }

        var anchors = document.querySelectorAll('a[href^="/"]');
        for (var i = 0; i < anchors.length; i++) {
          var a = anchors[i];
          if (a.querySelector('img[alt*="profile picture" i]') || a.querySelector('img[alt*="profile" i]')) {
            var h = (a.getAttribute('href') || '').replace(/^\\/+|\\/+$/g, '');
            if (h && h.indexOf('/') === -1 && /^[a-zA-Z0-9._]{1,30}$/.test(h) && ignored.indexOf(h.toLowerCase()) === -1) {
              window.__ANCHOR_USER__ = h;
              if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOGGED_IN_USER', username: h }));
              return;
            }
          }
        }

        var headerEls = document.querySelectorAll('header span, header h1, header button span, header div[role="button"]');
        for (var i = 0; i < headerEls.length; i++) {
          var raw = (headerEls[i].textContent || '').trim().split('\\n')[0].replace(/[∨⌄▼v\\s]/g, '');
          if (/^[a-zA-Z0-9._]{3,30}$/.test(raw) && ignored.indexOf(raw.toLowerCase()) === -1) {
            window.__ANCHOR_USER__ = raw;
            if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOGGED_IN_USER', username: raw }));
            return;
          }
        }

        var avatars = document.querySelectorAll('img[alt*="profile picture" i]');
        for (var i = 0; i < avatars.length; i++) {
          var match = (avatars[i].alt || '').match(/^([^'’]+)['’]s profile picture/i);
          if (match && match[1] && ignored.indexOf(match[1].toLowerCase()) === -1) {
            window.__ANCHOR_USER__ = match[1];
            if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOGGED_IN_USER', username: match[1] }));
            return;
          }
        }
      } catch(e) {}
    }

    detectUser();
    var checkInterval = setInterval(function() {
      if (window.__ANCHOR_USER__) {
        clearInterval(checkInterval);
      } else {
        detectUser();
      }
    }, 2000);

    // Reliable native router
    window.__anchorRoute = function(destination) {
      if (destination === 'activity') {
        window.location.href = 'https://www.instagram.com/accounts/activity/';
      } else if (destination === 'messages') {
        window.location.href = 'https://www.instagram.com/direct/inbox/';
      } else if (destination === 'profile') {
        if (window.__ANCHOR_USER__) {
          window.location.href = 'https://www.instagram.com/' + window.__ANCHOR_USER__ + '/';
          return;
        }
        detectUser();
        if (window.__ANCHOR_USER__) {
          window.location.href = 'https://www.instagram.com/' + window.__ANCHOR_USER__ + '/';
          return;
        }
        window.location.href = 'https://www.instagram.com/accounts/edit/';
      } else if (destination === 'settings') {
        var gear = document.querySelector('svg[aria-label*="Options" i], svg[aria-label*="Settings" i], a[href*="/accounts/settings/"]');
        var gearBtn = gear ? gear.closest('a, button, div[role="button"]') : null;
        if (gearBtn) {
          gearBtn.click();
        } else {
          window.location.href = 'https://www.instagram.com/accounts/settings/';
        }
      }
    };
  })();
  true;
`;

// Standard Native SVG Icons (24x24)
const ActivityIcon = ({ active, color }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill={active ? color : 'none'}>
    <Path
      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
      stroke={color}
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const MessagesIcon = ({ active, color }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill={active ? color : 'none'}>
    <Path
      d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
      stroke={color}
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ProfileIcon = ({ active, color }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill={active ? color : 'none'}>
    <Path
      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
      stroke={color}
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx={12} cy={7} r={4} stroke={color} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SettingsIcon = ({ active, color }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" fill={active ? color : 'none'} />
    <Path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
      stroke={color}
      strokeWidth={active ? 2.2 : 1.8}
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
  const [loggedInUser, setLoggedInUser] = useState('nagumoo_001');
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

  const navigateTo = (tab) => {
    setActiveTab(tab);
    if (!webViewRef.current) return;

    if (tab === 'activity') {
      webViewRef.current.injectJavaScript("window.location.href = 'https://www.instagram.com/accounts/activity/'; true;");
    } else if (tab === 'messages') {
      webViewRef.current.injectJavaScript("window.location.href = 'https://www.instagram.com/direct/inbox/'; true;");
    } else if (tab === 'profile') {
      const targetUser = loggedInUser || 'nagumoo_001';
      webViewRef.current.injectJavaScript(`
        (function() {
          var p = window.location.pathname || '';
          if (p.indexOf('/${targetUser}') !== -1) return;
          window.location.href = 'https://www.instagram.com/${targetUser}/';
        })();
        true;
      `);
    } else if (tab === 'settings') {
      webViewRef.current.injectJavaScript(`
        (function() {
          var gear = document.querySelector('svg[aria-label*="Options" i], svg[aria-label*="Settings" i], a[href*="/accounts/settings/"]');
          var gearBtn = gear ? gear.closest('a, button, div[role="button"]') : null;
          if (gearBtn) {
            gearBtn.click();
          } else {
            window.location.href = 'https://www.instagram.com/accounts/settings/';
          }
        })();
        true;
      `);
    }
  };

  const onShouldStartLoadWithRequest = (request) => {
    const url = request.url || '';
    const isGlobalReels = /^https?:\/\/(?:www\.)?instagram\.com\/reels\/?(?:\?.*)?$/i.test(url);
    const isExplore = /^https?:\/\/(?:www\.)?instagram\.com\/explore\/?(?:\?.*)?$/i.test(url);

    if (isGlobalReels || isExplore) {
      webViewRef.current?.injectJavaScript("window.location.href = 'https://www.instagram.com/direct/inbox/'; true;");
      return false;
    }
    return true;
  };

  const topPadding = insets.top;
  const bottomBarHeight = 52 + Math.max(insets.bottom, 6);

  return (
    <View style={[styles.container, { backgroundColor: themeBg }]}>
      <StatusBar
        backgroundColor={isDark ? '#000000' : '#FFFFFF'}
        barStyle={isDark ? 'light-content' : 'dark-content'}
        translucent={Platform.OS === 'android'}
      />

      {/* Slim Top Header */}
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

      {/* Native Instagram WebView (Spans full height, seamlessly overlaid by Anchor nav bar) */}
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
        userAgent={USER_AGENT}
        allowsBackForwardNavigationGestures={true}
        injectedJavaScriptBeforeContentLoaded={getInitJS(isDark)}
        injectedJavaScript={getInjectedJS(isDark)}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onNavigationStateChange={(navState) => {
          if (navState.canGoBack !== canGoBack) {
            setCanGoBack(navState.canGoBack);
          }
          const url = navState.url || '';
          const isGlobalReels = /^https?:\/\/(?:www\.)?instagram\.com\/reels\/?(?:\?.*)?$/i.test(url);
          const isExplore = /^https?:\/\/(?:www\.)?instagram\.com\/explore\/?(?:\?.*)?$/i.test(url);
          if (isGlobalReels || isExplore) {
            webViewRef.current?.injectJavaScript("window.location.replace('https://www.instagram.com/direct/inbox/'); true;");
            return;
          }

          if (url.includes('/direct/inbox') || url.includes('/direct/t/')) {
            setActiveTab('messages');
          } else if (url.includes('/accounts/activity')) {
            setActiveTab('activity');
          } else if (url.includes('/accounts/settings') || url.includes('/accounts/edit')) {
            setActiveTab('settings');
          } else if (loggedInUser && url.includes(`/${loggedInUser}`)) {
            setActiveTab('profile');
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

      {/* Anchor's Sole Native Bottom Navigation Bar (Docked solidly over Instagram's bottom position) */}
      <View
        style={[
          styles.standardNavBar,
          {
            backgroundColor: isDark ? '#000000' : '#FFFFFF',
            borderTopColor: isDark ? '#262626' : '#DBDBDB',
            paddingBottom: Math.max(insets.bottom, 6),
            height: bottomBarHeight,
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
              style={styles.tabItem}
            >
              <View style={styles.iconWrapper}>
                <TabIcon active={isActive} color={itemColor} />
              </View>
              <Text
                style={[
                  styles.tabLabel,
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
  standardNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 0.5,
    width: '100%',
    zIndex: 999,
    elevation: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 26,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    letterSpacing: -0.1,
  },
});
