# ⚓ Anchor: Distraction-Free Instagram Client

<p align="center">
  <img src="./assets/icon.png" width="100" height="100" alt="Anchor Logo" style="border-radius: 20px;" />
</p>

<p align="center">
  <strong>A distraction-free, privacy-preserving mobile client for Instagram that eliminates algorithmic engagement loops while keeping messaging, notifications, and personal profile management intact.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Android%20%7C%20iOS%20%7C%20macOS-black?style=for-the-badge&logo=android" alt="Platforms" />
  <img src="https://img.shields.io/badge/Framework-React%20Native%20%7C%20Expo-000020?style=for-the-badge&logo=expo" alt="Framework" />
  <img src="https://img.shields.io/badge/Theme-OLED%20Dark%20Mode-10b981?style=for-the-badge" alt="Theme" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License" />
</p>

---

## 💡 The Philosophy Behind Anchor

Modern social media apps are engineered around infinite algorithmic feeds (Reels, Explore grids, Suggested Posts) designed to maximize screen time rather than utility. 

**Anchor** flips the script:
- It isolates the essential communication tools you actually need: **Direct Messages**, **Activity Alerts**, and your **Personal Profile**.
- It eliminates the dopamine traps: **Infinite Reels**, **Explore grids**, and the **Home Feed**.
- It ensures full control over your account settings and privacy without compromising your attention.

---

## ✨ Key Features

### 1. 💬 Direct Messages as Default Landing
- Automatically boots straight into your Direct Messages inbox (`https://www.instagram.com/direct/inbox/`).
- Full support for conversation threads, voice notes, photo/video sharing, unread indicators, and emoji reactions.

### 2. 🛡️ Strict Distraction Shield & Reel Isolation
- **DM Reel Isolation:** When a friend sends you a Reel or Post link in DMs (`/reel/SHORTCODE/` or `/p/SHORTCODE/`), Anchor allows you to view that specific video in an isolated overlay.
- **Infinite Swipe Trap Locked:** Vertical swipe gestures that trigger Instagram's infinite recommendation carousel are actively blocked.
- **Overlay Exit Control:** Features a prominent **`⚓ Back to Messages`** floating button that instantly returns you to the active chat thread.
- **Feed Interception:** Any accidental route to `/`, `/#`, `/explore`, or `/reels` is immediately redirected back to Direct Messages.
- **Zero-Flicker CSS Shield:** Strips Explore and Reels icons before they render in the DOM, preventing visual flash.

### 3. 📱 Fixed 4-Tab Native Bottom Navigation
Rendered cleanly beneath the WebView, replacing Instagram's built-in web bottom bar:

| Tab | Route | Description |
|---|---|---|
| **🔔 Notifications** | `/accounts/activity/` | View mentions, tags, follow requests, and post comments. |
| **💬 Messages** *(Default)* | `/direct/inbox/` | Direct Messaging inbox and conversation threads. |
| **👤 Profile** | `/${your_username}/` | Your personal profile with bio, follower metrics, Story Highlights, and full personal posts/reels grid *(never defaults to Edit Profile)*. |
| **⚙️ Settings** | Native Panel | Account status, distraction blocking statistics, and Instagram Account Settings shortcuts. |

### 4. ⚙️ Integrated Instagram Account Settings Hub
- Direct access to official Instagram Account Settings (`/accounts/settings/`), Privacy & Security (`/accounts/privacy_and_security/`), and Profile editing.
- One-tap session management with a dedicated **"Clear Cache & Log Out"** function.

### 5. 🔒 Direct & Secure Authentication
- Anchor wraps Instagram's official secure web interface directly inside a native WebView.
- **Zero middleman servers:** Your login credentials, 2FA tokens, and session cookies stay strictly between your device and Instagram's official servers.
- Preserves persistent cookies and local storage across app restarts.

---

## 🏗️ Architecture & Injection Engine

```
                      ┌────────────────────────────────────────┐
                      │             Anchor Shell               │
                      │  (Minimalist Header + Native 4-Tab)    │
                      └──────────────────┬─────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
    ┌─────────────────────────┐                     ┌─────────────────────────┐
    │  Native Settings Screen │                     │   Distraction-Free      │
    │  - Distraction Stats    │                     │   WebKit / WebView      │
    │  - IG Account Settings  │                     └────────────┬────────────┘
    │  - Session Control      │                                  │
    └─────────────────────────┘                                  ▼
                                                  ┌──────────────────────────────┐
                                                  │    Anchor Injection Engine   │
                                                  │  - Zero-Flicker CSS Shield   │
                                                  │  - DOM Mutation Observer     │
                                                  │  - DM Reel Swipe Interceptor │
                                                  │  - Route Redirector          │
                                                  └──────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/anchor.git
   cd anchor
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

---

## 📲 How to Run & Test

### Option 1: Test on Your Phone with Expo Go (Easiest)

1. Install **Expo Go** on your device:
   - [Expo Go for Android (Google Play)](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [Expo Go for iOS (App Store)](https://apps.apple.com/app/expo-go/id982107779)

2. Start the development server with tunnel mode:
   ```bash
   npx expo start --tunnel
   ```
   *(Tunnel mode ensures seamless connection over cellular or cross-network Wi-Fi).*

3. Scan the terminal QR code:
   - **Android:** Open Expo Go and tap **Scan QR Code**.
   - **iOS:** Open the default **Camera app** and tap the Expo Go banner.

---

### Option 2: Run the macOS Desktop Phone Simulator

Test Anchor in an iPhone-sized window directly on your Mac desktop with full WebKit rendering and the distraction-free engine active:

```bash
./run_desktop.sh
```

*(To recompile the desktop simulator after code changes: `swiftc desktop_runner.swift -o AnchorDesktop`)*

---

### Option 3: Build a Standalone Android APK

To generate a standalone `.apk` you can install permanently on your Android phone without Expo Go:

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Build preview APK
npx eas-cli build -p android --profile preview
```

Follow the prompts to download your `.apk` directly to your phone.

---

## 📂 Project Structure

```
├── App.js                 # Complete React Native mobile app (Header, WebView, Tabs, Settings)
├── desktop_runner.swift   # Native macOS desktop phone simulator (AppKit + WebKit)
├── run_desktop.sh         # One-click desktop runner script
├── app.json               # Expo project metadata & bundle configuration
├── package.json           # Project dependencies & scripts
└── assets/                # App icon, splash screen, and adaptive icons
```

---

## 🛡️ Security & Privacy Notice

Anchor is a client-side wrapper around Instagram's web application:
- **No data collection:** Anchor contains no tracking scripts, ads, or external telemetry.
- **Direct connection:** All network requests and cookies route directly to `*.instagram.com`.
- **Open source:** Every line of code running inside the application shell is inspectable in this repository.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  Made with focus in mind ⚓
</p>
