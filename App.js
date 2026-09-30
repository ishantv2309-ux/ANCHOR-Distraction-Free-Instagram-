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

        /* 5. Strict Reel Overlay Isolation & Scroll Lock */
        html.anchor-reel-isolated,
        html.anchor-reel-isolated body,
        body.anchor-reel-isolated,
        body:has(a[href*="/reel/"]), 
        body:has(a[href*="/reels/"]) {
          overflow: hidden !important;
          touch-action: none !important;
          overscroll-behavior: none !important;
          overscroll-behavior-y: none !important;
          height: 100% !important;
          max-height: 100vh !important;
        }

        .anchor-reel-isolated * {
          overscroll-behavior-y: none !important;
          overscroll-behavior: none !important;
        }

        .anchor-reel-isolated div[style*="scroll-snap"],
        .anchor-reel-isolated div[style*="overflow-y"],
        .anchor-reel-isolated section[style*="overflow-y"],
        .anchor-reel-isolated main[style*="overflow-y"] {
          overflow-y: hidden !important;
          touch-action: none !important;
          scroll-snap-type: none !important;
        }

        /* Hide navigation arrow buttons pointing to next/prev reels */
        button[aria-label="Next Reel"],
        button[aria-label="Previous Reel"],
        div[role="button"]:has(svg[aria-label="Down chevron"]),
        div[role="button"]:has(svg[aria-label="Up chevron"]),
        .anchor-reel-isolated div[data-testid="suggested-users"],
        .anchor-reel-isolated section:has(a[href*="/reels/"]),
        .anchor-reel-isolated a[href*="/reels/"],
        .anchor-reel-isolated svg[aria-label*="Down" i],
        .anchor-reel-isolated svg[aria-label*="Up" i] {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
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

          /* Reel Overlay Isolation & Scroll Lock */
          html.anchor-reel-isolated,
          html.anchor-reel-isolated body,
          body.anchor-reel-isolated {
            overflow: hidden !important;
            touch-action: none !important;
            overscroll-behavior: none !important;
            overscroll-behavior-y: none !important;
            height: 100% !important;
            max-height: 100vh !important;
          }

          .anchor-reel-isolated * {
            overscroll-behavior-y: none !important;
            overscroll-behavior: none !important;
          }

          .anchor-reel-isolated div[style*="scroll-snap"],
          .anchor-reel-isolated div[style*="overflow-y"],
          .anchor-reel-isolated section[style*="overflow-y"],
          .anchor-reel-isolated main[style*="overflow-y"] {
            overflow-y: hidden !important;
            touch-action: none !important;
            scroll-snap-type: none !important;
          }

          .anchor-reel-isolated div[data-testid="suggested-users"],
          .anchor-reel-isolated section:has(a[href*="/reels/"]),
          .anchor-reel-isolated a[href*="/reels/"],
          .anchor-reel-isolated svg[aria-label*="Down" i],
          .anchor-reel-isolated svg[aria-label*="Up" i] {
            display: none !important;
            visibility: hidden !important;
            pointer-events: none !important;
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

    function isAllowedUtilityRoute() {
      const h = (window.location.hostname || '').toLowerCase();
      const p = (window.location.pathname || '').toLowerCase();
      const u = (window.location.href || '').toLowerCase();

      // Meta Accounts Center domains or URLs
      if (h.includes('accountscenter') || u.includes('accountscenter') || h.includes('meta.com')) {
        return true;
      }

      // Settings, Accounts, Profile, Privacy, Security, Legal, Help, About
      if (
        p.startsWith('/accounts') ||
        p.startsWith('/settings') ||
        p.startsWith('/privacy') ||
        p.startsWith('/security') ||
        p.startsWith('/legal') ||
        p.startsWith('/help') ||
        p.startsWith('/about') ||
        u.includes('account_center')
      ) {
        return true;
      }

      // Active utility tabs in Anchor
      if (
        window.__ANCHOR_ACTIVE_TAB__ === 'settings' ||
        window.__ANCHOR_ACTIVE_TAB__ === 'profile' ||
        window.__ANCHOR_ACTIVE_TAB__ === 'activity' ||
        window.location.search.includes('activity=1')
      ) {
        return true;
      }

      return false;
    }

    // 7. Route Enforcement (Keep user on distraction-free pages)
    function enforceInboxRoute() {
      if (isAllowedUtilityRoute()) {
        return; // Full access to Accounts Center, Settings, Profile, Privacy, Activity
      }
      const host = (window.location.hostname || '').toLowerCase();
      const path = (window.location.pathname || '').toLowerCase();

      // Only redirect if on Instagram main home feed or infinite explore feed
      const isInstagramMain = host.includes('instagram.com') && !host.includes('accountscenter');
      if (isInstagramMain && (path === '/' || path === '/#' || path === '' || path === '/explore' || path === '/explore/')) {
        window.location.replace('https://www.instagram.com/direct/inbox/');
      }
    }

    // 8. Strict Reel Isolation & Infinite Scroll Eradication Engine
    function extractReelIdFromUrl(url) {
      if (!url) return null;
      const m = url.toString().match(/\/(reels?|p)\/([A-Za-z0-9_-]+)/i);
      return m ? m[2] : null;
    }

    let activeIsolatedReelId = null;

    function isReelOverlay() {
      const p = (window.location.pathname || '').toLowerCase();
      // Match /reel/, /reels/, /p/, /share/reel/
      if (p.includes('/reel') || p.startsWith('/p/')) {
        return true;
      }
      // DOM check: full-screen video with Instagram's Reel UI components
      const v = document.querySelector('video');
      if (v) {
        const inDirectChat = p.includes('/direct/t/') && !document.querySelector('div[role="dialog"] video, div[aria-modal="true"] video');
        if (!inDirectChat) {
          const hasActionIcons = document.querySelector('svg[aria-label*="Like" i]') && document.querySelector('svg[aria-label*="Share" i]');
          const hasReelHeaders = Array.from(document.querySelectorAll('span, button, a, h1, h2')).some(function(el) {
            const t = (el.innerText || el.textContent || '').trim().toLowerCase();
            return t === 'suggested' || t === '< suggested' || t === 'reels' || t === '< reels' || t === 'audio';
          });
          if (hasActionIcons || hasReelHeaders) {
            return true;
          }
        }
      }
      return false;
    }

    // Intercept SPA pushState / replaceState to block navigating to a second reel
    const origPushState = history.pushState;
    history.pushState = function(state, title, url) {
      if (url) {
        const urlStr = url.toString().toLowerCase();
        if (urlStr.includes('accountscenter') || urlStr.includes('/accounts') || urlStr.includes('/settings')) {
          activeIsolatedReelId = null;
          return origPushState.apply(this, arguments);
        }
        const reelId = extractReelIdFromUrl(urlStr);
        if (reelId) {
          if (!activeIsolatedReelId) {
            activeIsolatedReelId = reelId;
          } else if (reelId !== activeIsolatedReelId) {
            sendToNative({ type: 'RETURN_TO_MESSAGES' });
            return;
          }
        } else if (activeIsolatedReelId && (urlStr.includes('/reels') || urlStr.includes('/explore'))) {
          sendToNative({ type: 'RETURN_TO_MESSAGES' });
          return;
        }
      }
      return origPushState.apply(this, arguments);
    };

    const origReplaceState = history.replaceState;
    history.replaceState = function(state, title, url) {
      if (url) {
        const urlStr = url.toString().toLowerCase();
        if (urlStr.includes('accountscenter') || urlStr.includes('/accounts') || urlStr.includes('/settings')) {
          activeIsolatedReelId = null;
          return origReplaceState.apply(this, arguments);
        }
        const reelId = extractReelIdFromUrl(urlStr);
        if (reelId) {
          if (!activeIsolatedReelId) {
            activeIsolatedReelId = reelId;
          } else if (reelId !== activeIsolatedReelId) {
            sendToNative({ type: 'RETURN_TO_MESSAGES' });
            return;
          }
        }
      }
      return origReplaceState.apply(this, arguments);
    };

    // 1. Prevent vertical scroll / swipe events on Reel pages
    let startY = 0;

    document.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        startY = e.touches[0].clientY;
      }
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      const isReelPage = window.location.pathname.includes('/reel/') || 
                         window.location.pathname.includes('/reels/') ||
                         window.location.pathname.startsWith('/reel') ||
                         window.location.pathname.startsWith('/p/');
      if (isReelPage) {
        if (e.touches && e.touches[0]) {
          const currentY = e.touches[0].clientY;
          const diffY = Math.abs(currentY - startY);
          
          // Block vertical swipes exceeding 5px to prevent advancing to the next Reel
          if (diffY > 5) {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
          }
        }
      }
    }, { passive: false });

    // 2. Disable mouse wheel / trackpad scrolling on desktop/emulator previews
    window.addEventListener('wheel', (e) => {
      const isReelPage = window.location.pathname.includes('/reel/') || 
                         window.location.pathname.includes('/reels/') ||
                         window.location.pathname.startsWith('/reel') ||
                         window.location.pathname.startsWith('/p/');
      if (isReelPage) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
      }
    }, { passive: false });

    // Trap ArrowUp / ArrowDown / PageUp / PageDown keys on reel pages
    window.addEventListener('keydown', (e) => {
      const isReelPage = window.location.pathname.includes('/reel/') || 
                         window.location.pathname.includes('/reels/') ||
                         window.location.pathname.startsWith('/reel') ||
                         window.location.pathname.startsWith('/p/');
      if (isReelPage && ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '].includes(e.key)) {
        if (e.target && !['input', 'textarea'].includes(e.target.tagName.toLowerCase())) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }, { passive: false });

    // 3. Inject CSS rules to hide next/previous reel navigation arrows if present
    function injectReelLockStyles() {
      if (!document.getElementById('anchor-reel-lock-styles')) {
        const style = document.createElement('style');
        style.id = 'anchor-reel-lock-styles';
        style.innerHTML = \`
          /* Lock vertical overflow on Reel container */
          body:has(a[href*="/reel/"]), body:has(a[href*="/reels/"]) {
            overflow: hidden !important;
            touch-action: none !important;
          }
          
          /* Hide navigation arrow buttons pointing to next/prev reels */
          button[aria-label="Next Reel"],
          button[aria-label="Previous Reel"],
          div[role="button"]:has(svg[aria-label="Down chevron"]),
          div[role="button"]:has(svg[aria-label="Up chevron"]) {
            display: none !important;
          }
        \`;
        (document.head || document.documentElement).appendChild(style);
      }
    }
    injectReelLockStyles();

    // Scroll Position Hard Clamping
    window.addEventListener('scroll', function() {
      const isReelPage = window.location.pathname.includes('/reel/') || window.location.pathname.includes('/reels/');
      if (isReelPage) {
        if (window.scrollY !== 0 || window.pageYOffset !== 0) {
          window.scrollTo(0, 0);
        }
      }
    }, { capture: true, passive: false });

    document.addEventListener('scroll', function(e) {
      const isReelPage = window.location.pathname.includes('/reel/') || window.location.pathname.includes('/reels/');
      if (isReelPage && e.target && e.target !== document) {
        if (e.target.scrollTop && e.target.scrollTop !== 0) {
          e.target.scrollTop = 0;
        }
      }
    }, { capture: true, passive: false });

    // Lock Reel DOM, hide recommendation handles, and ensure Back to Messages button
    function applyReelIsolation() {
      const isReel = isReelOverlay();
      const docEl = document.documentElement;
      const docBody = document.body;

      if (isReel) {
        injectReelLockStyles();
        if (!activeIsolatedReelId) {
          activeIsolatedReelId = extractReelIdFromUrl(window.location.href);
        }

        if (docEl) {
          docEl.classList.add('anchor-reel-isolated');
          docEl.style.setProperty('overflow', 'hidden', 'important');
          docEl.style.setProperty('touch-action', 'none', 'important');
          docEl.style.setProperty('overscroll-behavior', 'none', 'important');
        }
        if (docBody) {
          docBody.classList.add('anchor-reel-isolated');
          docBody.style.setProperty('overflow', 'hidden', 'important');
          docBody.style.setProperty('touch-action', 'none', 'important');
          docBody.style.setProperty('overscroll-behavior', 'none', 'important');
        }

        // Lock all scroll containers in the reel view
        document.querySelectorAll('div, section, main, article').forEach(function(el) {
          const comp = window.getComputedStyle(el);
          if (
            comp.overflowY === 'scroll' || 
            comp.overflowY === 'auto' || 
            (el.style && el.style.scrollSnapType && el.style.scrollSnapType !== 'none') ||
            (comp.scrollSnapType && comp.scrollSnapType !== 'none')
          ) {
            el.style.setProperty('overflow-y', 'hidden', 'important');
            el.style.setProperty('touch-action', 'none', 'important');
            el.style.setProperty('scroll-snap-type', 'none', 'important');
            el.scrollTop = 0;
          }
        });

        // Hide and purge subsequent (next) reel slides in the DOM so there is nowhere to scroll to
        const v = document.querySelector('video');
        if (v) {
          const slide = v.closest('article') || v.closest('section') || v.closest('div[style*="100%"]');
          if (slide && slide.parentElement) {
            let next = slide.nextElementSibling;
            while (next) {
              next.style.setProperty('display', 'none', 'important');
              next.style.setProperty('visibility', 'hidden', 'important');
              next.remove();
              next = slide.nextElementSibling;
            }
          }
        }

        // Hook Instagram's own back button (< Suggested / < Back) to cleanly return to chat
        document.querySelectorAll('header button, header a, div[role="button"], a[role="link"]').forEach(function(el) {
          const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
          if (txt === 'suggested' || txt === '< suggested' || txt === 'reels' || txt === '< reels' || txt === 'back') {
            if (!el.__anchor_hooked) {
              el.__anchor_hooked = true;
              el.addEventListener('click', function(ev) {
                ev.preventDefault();
                ev.stopPropagation();
                activeIsolatedReelId = null;
                sendToNative({ type: 'RETURN_TO_MESSAGES' });
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  window.location.replace('https://www.instagram.com/direct/inbox/');
                }
              }, true);
            }
          }
        });

        // Hide recommendation carousels, related reels, and "Watch more"
        document.querySelectorAll('h2, h3, span, div, a').forEach(function(el) {
          if (el.children.length > 2) return;
          const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
          if (
            txt === 'watch more reels' || 
            txt === 'more reels' || 
            txt === 'suggested reels' || 
            txt === 'related reels' || 
            txt === 'watch again' ||
            txt.startsWith('more reels from')
          ) {
            let container = el.closest('div[style*="flex"]') || el.closest('section') || el.parentElement;
            if (container) {
              container.style.setProperty('display', 'none', 'important');
            }
          }
        });

        // Ensure the Floating "Back to Messages" button is visible below the Anchor header
        if (!document.getElementById('anchor-exit-reel-btn')) {
          const btn = document.createElement('button');
          btn.id = 'anchor-exit-reel-btn';
          btn.innerHTML = '⚓ Back to Messages';
          btn.style.cssText = "position: fixed !important; top: 70px !important; left: 14px !important; z-index: 2147483647 !important; background: rgba(15, 23, 42, 0.95) !important; color: #ffffff !important; border: 1px solid rgba(255, 255, 255, 0.35) !important; border-radius: 20px !important; padding: 8px 16px !important; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif !important; font-size: 13px !important; font-weight: 700 !important; cursor: pointer !important; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.75) !important; backdrop-filter: blur(8px) !important; display: flex !important; align-items: center !important; gap: 6px !important; pointer-events: auto !important;";
          btn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            activeIsolatedReelId = null;
            sendToNative({ type: 'RETURN_TO_MESSAGES' });
            if (window.history.length > 1) {
              window.history.back();
            } else {
              window.location.replace('https://www.instagram.com/direct/inbox/');
            }
          };
          (document.body || document.documentElement).appendChild(btn);
        }
      } else {
        activeIsolatedReelId = null;
        if (docEl) {
          docEl.classList.remove('anchor-reel-isolated');
          docEl.style.removeProperty('overflow');
          docEl.style.removeProperty('touch-action');
          docEl.style.removeProperty('overscroll-behavior');
        }
        if (docBody) {
          docBody.classList.remove('anchor-reel-isolated');
          docBody.style.removeProperty('overflow');
          docBody.style.removeProperty('touch-action');
          docBody.style.removeProperty('overscroll-behavior');
        }
        const existing = document.getElementById('anchor-exit-reel-btn');
        if (existing) existing.remove();
      }
    }

    applyStyles();
    purgeAppBanners();
    enforceInboxRoute();
    purgeToastbar();
    handleActivityView();
    applyReelIsolation();

    // 9. Lightweight MutationObserver (debounced to 100ms)
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
          applyReelIsolation();
        }, 100);
      }
    });

    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  })();
  true;
`;

function extractReelId(url) {
  if (!url) return null;
  const match = url.match(/\/(reels?|p)\/([A-Za-z0-9_-]+)/i);
  return match ? match[2] : null;
}

function MainScreen() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef(null);
  const activeTargetReelIdRef = useRef(null);
  const lastChatUrlRef = useRef('https://www.instagram.com/direct/inbox/');
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

  const handleReturnToMessages = () => {
    activeTargetReelIdRef.current = null;
    setActiveTab('messages');
    if (!webViewRef.current) return;
    const returnUrl = lastChatUrlRef.current || 'https://www.instagram.com/direct/inbox/';
    webViewRef.current.injectJavaScript(`
      (function() {
        window.__ANCHOR_ACTIVE_TAB__ = 'messages';
        if (window.location.pathname.startsWith('/reel/') || window.location.pathname.startsWith('/p/')) {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.replace('${returnUrl}');
          }
        }
      })();
      true;
    `);
  };

  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'LOGGED_IN_USER' && data.username) {
        setLoggedInUser(data.username);
      } else if (data.type === 'RETURN_TO_MESSAGES') {
        handleReturnToMessages();
      }
    } catch(e) {}
  };

  const handleGoBack = () => {
    if (activeTargetReelIdRef.current) {
      handleReturnToMessages();
      return;
    }
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
    activeTargetReelIdRef.current = null;
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
        onShouldStartLoadWithRequest={(request) => {
          const url = request.url || '';
          const urlLower = url.toLowerCase();
          const path = (url.split('?')[0] || '').toLowerCase();

          // 1. Always allow Meta Accounts Center, settings, accounts, privacy, auth, API, and direct messages
          if (
            urlLower.includes('accountscenter') ||
            urlLower.includes('meta.com') ||
            path.includes('/accounts') ||
            path.includes('/settings') ||
            path.includes('/privacy') ||
            path.includes('/security') ||
            path.includes('/help') ||
            path.includes('/about') ||
            path.includes('/direct/') ||
            path.includes('/api/')
          ) {
            if (path.includes('/direct/')) {
              lastChatUrlRef.current = url;
            }
            activeTargetReelIdRef.current = null;
            return true;
          }

          // 2. Strict Reel overlay isolation guard (matches /reel/<id>/, /reels/<id>/, and /p/<id>/)
          const reelId = extractReelId(url);
          if (reelId) {
            if (!activeTargetReelIdRef.current) {
              activeTargetReelIdRef.current = reelId;
              return true;
            } else if (reelId !== activeTargetReelIdRef.current) {
              // Intercept attempt to swipe/navigate to a second reel -> return to messages
              setTimeout(() => handleReturnToMessages(), 0);
              return false;
            }
            return true;
          }

          // 3. Plural reels feed (without a specific reel id) or explore is blocked in Anchor
          if (path.includes('/reels') || path.includes('/explore')) {
            setTimeout(() => handleReturnToMessages(), 0);
            return false;
          }

          return true;
        }}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
          const currentUrl = navState.url || '';
          const urlLower = currentUrl.toLowerCase();
          const path = (currentUrl.split('?')[0] || '').toLowerCase();

          if (path.includes('/direct/')) {
            lastChatUrlRef.current = currentUrl;
            activeTargetReelIdRef.current = null;
            return;
          }

          // Accounts Center, Settings, Privacy, Help
          if (
            urlLower.includes('accountscenter') ||
            urlLower.includes('meta.com') ||
            path.includes('/accounts') ||
            path.includes('/settings') ||
            path.includes('/privacy') ||
            path.includes('/security')
          ) {
            activeTargetReelIdRef.current = null;
            return;
          }

          const reelId = extractReelId(currentUrl);
          if (reelId) {
            if (!activeTargetReelIdRef.current) {
              activeTargetReelIdRef.current = reelId;
            } else if (reelId !== activeTargetReelIdRef.current) {
              setTimeout(() => handleReturnToMessages(), 0);
            }
          } else if (activeTargetReelIdRef.current && (path.includes('/reels') || path.includes('/explore'))) {
            setTimeout(() => handleReturnToMessages(), 0);
          }
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
