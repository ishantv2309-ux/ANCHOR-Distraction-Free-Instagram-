# Anchor: Distraction-Free Instagram Client
## Project Documentation & Preliminary Design Review (PDR)

**Project Name:** Anchor  
**Repository Directory:** `/Users/ishantverma/Desktop/instafocus`  
**Package Identifier:** `com.anchor.app`  
**Platforms:** Android (React Native / Expo), macOS Desktop Simulator (Swift / WebKit)  
**Last Updated:** September 2026  
**Status:** Feature Complete & Production Hardened  

---

## 1. Executive Summary & Mission

Modern social media platforms are intentionally engineered with engagement-maximizing feedback loops: algorithmic recommendation grids, infinite video feeds (Reels/Shorts), AI-suggested content, and persistent notification triggers. These patterns trap users in unmindful consumption loops while burying genuine interpersonal communication.

**Anchor** is a minimalist, distraction-free Instagram client engineered to solve this problem. It surgically strips away all passive algorithmic feeds while preserving active communication channels:

*   **Eradicated:** Reels feeds (`/reels/`), Explore recommendation grids (`/explore/`), algorithmic home feed posts, "Suggested for you" follower carousels, and persistent "Use the app" download banners.
*   **Preserved:** 1-on-1 Direct Messages, group chats, Notes, media sharing, Activity notifications (likes, comments, follow requests), Personal Profile management, and Instagram Settings.

Anchor is delivered as an Android mobile app (React Native / Expo) and an identical standalone macOS phone simulator (`desktop_runner.swift`).

---

## 2. System Architecture & Tech Stack

```
+--------------------------------------------------------------------------+
|                               ANCHOR CLIENT                              |
+--------------------------------------------------------------------------+
|  Top Header Bar: ⚓ Anchor | ● Focused Badge | ◀ Back | ↻ Reload           |
+--------------------------------------------------------------------------+
|                                                                          |
|  [Hardware Accelerated WebView: react-native-webview / WKWebView]        |
|  +--------------------------------------------------------------------+  |
|  | CSS Preload Engine (injectedJavaScriptBeforeContentLoaded)         |  |
|  |   - Hides /reels/, /explore/, home triggers, app download banners   |  |
|  +--------------------------------------------------------------------+  |
|  | Runtime Engine (Throttled MutationObserver + Event Interceptors)    |  |
|  |   - Geometric Bottom Bar Filter (height: 35-85px, top >= vh-95px)  |  |
|  |   - Dynamic User Detection (chevron ∨, avatar links, viewer data)  |  |
|  |   - Route Enforcer (redirects rogue feed requests back to DM inbox) |  |
|  |   - Anti-Upsell Purger (removes "Get the app" leaf buttons)        |  |
|  +--------------------------------------------------------------------+  |
|  | Live Content Layer: Instagram Web (Polaris SPA)                     |  |
|  |   - Direct Inbox (/direct/inbox/)                                   |  |
|  |   - Activity & Notifications Drawer                                |  |
|  |   - Active User Profile (/username/)                                |  |
|  |   - Account Settings (/accounts/settings/)                         |  |
|  +--------------------------------------------------------------------+  |
|                                                                          |
+--------------------------------------------------------------------------+
|  Bottom Navigation: 🔔 Activity | 💬 Messages | 👤 Profile | ⚙️ Settings    |
|  (Adaptive Safe Area Insets for Android gesture bar and iOS home pill)  |
+--------------------------------------------------------------------------+
```

### Technology Matrix

| Layer | Android Mobile Application | macOS Desktop Simulator |
| :--- | :--- | :--- |
| **Runtime Environment** | React Native 0.86.3 / Expo SDK 57 | Native macOS AppKit (`NSApplication`) |
| **Web Rendering Engine**| Android System WebView (`react-native-webview 13.16.1`) | Apple WebKit (`WKWebView`) |
| **Hardware Flags** | `androidLayerType="hardware"`, `renderToHardwareTextureAndroid={true}` | Metal Hardware Accelerated Compositor |
| **Navigation Shell** | Custom React Native View with Safe Area Insets | Native AppKit `NSView` / Auto Layout Stacks |
| **Build Pipeline** | EAS Build (`preview` profile producing `.apk`) | Swift Compiler (`swiftc -O`) |
| **Color System** | Pure OLED Black `#000000`, Surfaces `#080808`, Emerald `#0fb981` | Pure OLED Black `#000000`, Surfaces `#0a0a0a` |

---

## 3. Core Features & User Experience

### 3.1. Anchor Top Navigation Bar
*   **Brand Identity:** Renders `⚓ Anchor` with a glowing emerald `● Focused` pill badge.
*   **Back Navigation (`◀`):** Multi-level fallback handler:
    1.  Detects and triggers Instagram's in-page back controls (e.g. `〈` chevron in Notifications or `←` in chats).
    2.  Pops the Single Page Application (SPA) HTML5 history stack via `window.history.back()`.
    3.  Falls back to native WebView `webView.goBack()`.
*   **Restart / Refresh (`↻`):** Resets state trigger flags and forces an un-cached reload of the current tab.
*   **Accessibility:** Enlarged $36\times36\text{dp}$ touch targets with $12\text{dp}$ hit-slop and haptic-style visual opacity feedback.

### 3.2. Anchor 4-Tab Bottom Navigation Bar
*   **🔔 Activity Tab:** Dynamically routes to the user's notifications without feed pollution. Suppresses feed carousels and triggers Instagram's notifications panel.
*   **💬 Messages Tab (Default):** Directly loads `https://www.instagram.com/direct/inbox/`. Displays chat threads, message requests, notes, and full conversation views.
*   **👤 Profile Tab:** Uses zero-hardcoded dynamic session extraction to navigate to the exact logged-in user profile (`https://www.instagram.com/<username>/`).
*   **⚙️ Settings Tab:** Instantly opens Instagram's native account settings (`https://www.instagram.com/accounts/settings/`) without intermediate popup prompts.
*   **Gesture Bar Inset Protection:** Implemented using `react-native-safe-area-context`. The bottom nav automatically calculates `paddingBottom: Math.max(insets.bottom, 10)` so navigation labels are never covered by the white Android gesture line.

---

## 4. Key Engineering Inventions & Algorithms

### 4.1. Non-Destructive Geometric Bottom Bar Filter
*   **Problem:** Instagram mobile web renders a floating web bottom bar (Direct icon + avatar) directly above Anchor's native bottom bar. Earlier attempts to remove it using CSS selectors like `nav`, `[role="navigation"]`, or `div:has(...)` either failed on older Android WebViews or destructively hid the entire Direct Message chat list, causing blank screens.
*   **Solution:** An exact geometric filter implemented in JavaScript and throttled via `MutationObserver`:
    $$\text{Target} = \{ \text{el} \mid \text{position} \in \{\text{fixed}, \text{sticky}\},\, \text{height} \in [35, 85]\text{px},\, \text{top} \ge \text{vh} - 95\text{px},\, \text{width} \ge 70\%\text{vw},\, \text{input} = \emptyset \}$$
    This guarantees that chat lists ($>400\text{px}$), headers ($\text{top}=0$), and message input composers are completely preserved while Instagram's redundant web bar is seamlessly hidden.

### 4.2. Dynamic Logged-In User Detection
*   **Problem:** Early prototypes had a static test handle (`jack_98472`) hardcoded into the build. When running on real devices with personal accounts, clicking "Profile" opened someone else's page with a blue "Follow" button.
*   **Solution:** A 5-tier dynamic extractor (`detectLoggedInUser`):
    1.  **Header Chevron Title:** Scans top header heading candidates in the top $90\text{px}$ for usernames accompanied by the downward account switcher chevron (`∨`, `⌄`, `▼`). (e.g. `nagumoo_001 ∨`).
    2.  **Avatar Links:** Scans all `a[href^="/"]` containing profile images across the DOM.
    3.  **Image Alt Attributes:** Matches regex `^([^'’]+)['’]s profile picture`.
    4.  **JavaScript Context Globals:** Extracts `window._sharedData.config.viewer.username` and `window.__initialData.data.viewer.username`.
    5.  **Local Storage Inspection:** Safely queries Polaris session and user storage keys.

### 4.3. Anti-Upsell & Banner Purger
*   **Problem:** Instagram aggressively inserts "Get the app", "Use the app", and "Open in app" prompts across profile headers, notification lists, and bottom sheets.
*   **Solution:**
    *   **Preload CSS Rule:** Hides known test IDs and download links (`data-testid="app-upsell"`, `a[href*="play.google.com"]`, `a[href*="instagram.com/download"]`).
    *   **Leaf Text Scanner:** Scans leaf text elements ($\le 1$ child) for exact phrases like `"get the app"` and `"open in app"`. Hides the button or small fixed banner ($\le 70\text{px}$) without touching parent layout containers or the notifications feed.

---

## 5. Major Bug Fixes & Problem-Solving History

| Issue Encountered | Root Cause | Engineering Solution |
| :--- | :--- | :--- |
| **Profile opened `jack_98472`** | Hardcoded username string in legacy code and cached Hermes bytecode. | Eradicated string from all files; implemented multi-tier `detectLoggedInUser()`. |
| **Completely Blank Screen on Android** | CSS rules `nav, [role="navigation"]` hid chat list; JS ancestor crawl hid root view. | Removed destructive CSS rules; switched to non-destructive geometric filtering. |
| **Empty Notification Center** | `header ~ div:has(download)` hid page body; `article` suppression hid items; heart re-clicked in loop. | Removed `header ~ div`; protected notification articles; added single-fire guard `__ACTIVITY_TRIGGERED__`. |
| **Bottom Nav Covered by Android Line** | Fixed $56\text{dp}$ height with zero bottom padding over modern gesture bars. | Integrated `useSafeAreaInsets()` to add dynamic `paddingBottom` matching system insets. |
| **Top Navbar Missing on Mobile** | Top navigation bar was only written in Swift desktop simulator, not in React Native. | Ported `topHeader` to `App.js` with Anchor branding, status dot, and action buttons. |
| **Back Button (`◀`) Failed** | React Native `canGoBack` is false for SPA pushState route changes. | Added in-page back chevron clicker (`〈`, `←`) with `window.history.back()` fallback. |

---

## 6. How to Build, Test & Update the App

### 6.1. Updating the Installed Android APK (Without Losing Login)
1.  **Commit Code Changes:** Ensure latest fixes are committed in Git (`git commit -m "..."`).
2.  **Trigger EAS Build:**
    ```bash
    npx eas build -p android --profile preview
    ```
3.  **Install Over Existing App:** Download the generated `.apk` link on the Android device and tap **"Update"**. Android updates the binary in-place without clearing login cookies.

### 6.2. Live Testing via Expo Go
```bash
npx expo start
```
Scan the displayed QR code with the Expo Go app on Android for real-time hot-reloading.

### 6.3. Running the macOS Desktop Simulator
```bash
cd /Users/ishantverma/Desktop/instafocus
swiftc desktop_runner.swift -o AnchorDesktop
./run_desktop.sh
```

---

## 7. Conclusion & Verification

Anchor provides a reliable, high-performance, distraction-free Instagram experience on both mobile devices and desktop computers. By moving from destructive DOM deletions to precision geometric filtering and dynamic session detection, the client maintains high UI stability, low CPU overhead, and instant touch responsiveness.
