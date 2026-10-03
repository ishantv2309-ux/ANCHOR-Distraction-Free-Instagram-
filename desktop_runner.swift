import Cocoa
import WebKit

class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    var window: NSWindow!
    var webView: WKWebView!
    var currentTab = "messages"
    var titleLabel: NSTextField!
    var detectedUsername: String? = UserDefaults.standard.string(forKey: "anchor_saved_username")
    var activeTargetReelId: String? = nil
    var activeReelUrl: String? = nil
    var lastChatUrl: String = "https://www.instagram.com/direct/inbox/"

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)

        let windowWidth: CGFloat = 390
        let windowHeight: CGFloat = 844
        let screenSize = NSScreen.main?.visibleFrame.size ?? CGSize(width: 1440, height: 900)
        let rect = NSRect(
            x: (screenSize.width - windowWidth) / 2,
            y: (screenSize.height - windowHeight) / 2,
            width: windowWidth,
            height: windowHeight
        )

        window = NSWindow(
            contentRect: rect,
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Anchor • Distraction-Free Instagram"
        window.backgroundColor = NSColor(calibratedRed: 0.0, green: 0.0, blue: 0.0, alpha: 1.0)
        window.isReleasedWhenClosed = false

        let rootContainer = NSView(frame: NSRect(x: 0, y: 0, width: windowWidth, height: windowHeight))
        rootContainer.wantsLayer = true
        rootContainer.layer?.backgroundColor = NSColor.black.cgColor

        // 1. Top Header
        let headerHeight: CGFloat = 52
        let headerView = NSView(frame: NSRect(x: 0, y: windowHeight - headerHeight, width: windowWidth, height: headerHeight))
        headerView.wantsLayer = true
        headerView.layer?.backgroundColor = NSColor(calibratedRed: 0.05, green: 0.05, blue: 0.05, alpha: 1.0).cgColor
        headerView.autoresizingMask = [.width, .minYMargin]

        // 1px subtle bottom border
        let borderLine = NSView(frame: NSRect(x: 0, y: 0, width: windowWidth, height: 1))
        borderLine.wantsLayer = true
        borderLine.layer?.backgroundColor = NSColor(calibratedRed: 0.12, green: 0.12, blue: 0.14, alpha: 1.0).cgColor
        borderLine.autoresizingMask = [.width]
        headerView.addSubview(borderLine)

        // Header Left: Title + Focused Badge in a centered NSStackView
        let titleGroup = NSStackView()
        titleGroup.orientation = .horizontal
        titleGroup.alignment = .centerY
        titleGroup.spacing = 8
        titleGroup.frame = NSRect(x: 16, y: 0, width: 220, height: headerHeight)
        titleGroup.autoresizingMask = [.height]

        titleLabel = NSTextField(labelWithString: "⚓ Anchor")
        titleLabel.textColor = .white
        titleLabel.font = NSFont.systemFont(ofSize: 17, weight: .bold)
        titleLabel.isBezeled = false
        titleLabel.drawsBackground = false
        titleLabel.isEditable = false
        titleLabel.isSelectable = false
        titleGroup.addArrangedSubview(titleLabel)

        // Pill badge with inner stack so the dot and text are centered
        let pillBadge = NSView()
        pillBadge.wantsLayer = true
        pillBadge.layer?.backgroundColor = NSColor(calibratedRed: 0.06, green: 0.72, blue: 0.50, alpha: 0.15).cgColor
        pillBadge.layer?.cornerRadius = 11
        pillBadge.layer?.borderWidth = 1
        pillBadge.layer?.borderColor = NSColor(calibratedRed: 0.06, green: 0.72, blue: 0.50, alpha: 0.35).cgColor
        pillBadge.translatesAutoresizingMaskIntoConstraints = false
        pillBadge.heightAnchor.constraint(equalToConstant: 22).isActive = true

        let badgeStack = NSStackView()
        badgeStack.orientation = .horizontal
        badgeStack.alignment = .centerY
        badgeStack.spacing = 5
        badgeStack.edgeInsets = NSEdgeInsets(top: 2, left: 8, bottom: 2, right: 8)
        badgeStack.translatesAutoresizingMaskIntoConstraints = false

        let dot = NSView()
        dot.wantsLayer = true
        dot.layer?.backgroundColor = NSColor(calibratedRed: 0.06, green: 0.72, blue: 0.50, alpha: 1.0).cgColor
        dot.layer?.cornerRadius = 3
        dot.translatesAutoresizingMaskIntoConstraints = false
        dot.widthAnchor.constraint(equalToConstant: 6).isActive = true
        dot.heightAnchor.constraint(equalToConstant: 6).isActive = true
        badgeStack.addArrangedSubview(dot)

        let statusText = NSTextField(labelWithString: "Focused")
        statusText.textColor = NSColor(calibratedRed: 0.06, green: 0.72, blue: 0.50, alpha: 1.0)
        statusText.font = NSFont.systemFont(ofSize: 11, weight: .semibold)
        statusText.isBezeled = false
        statusText.drawsBackground = false
        statusText.isEditable = false
        statusText.isSelectable = false
        badgeStack.addArrangedSubview(statusText)

        pillBadge.addSubview(badgeStack)
        NSLayoutConstraint.activate([
            badgeStack.leadingAnchor.constraint(equalTo: pillBadge.leadingAnchor),
            badgeStack.trailingAnchor.constraint(equalTo: pillBadge.trailingAnchor),
            badgeStack.topAnchor.constraint(equalTo: pillBadge.topAnchor),
            badgeStack.bottomAnchor.constraint(equalTo: pillBadge.bottomAnchor)
        ])

        titleGroup.addArrangedSubview(pillBadge)
        headerView.addSubview(titleGroup)

        rootContainer.addSubview(headerView)

        // 2. Bottom 4-Tab Navigation Bar (Glassmorphic)
        let navHeight: CGFloat = 60
        let bottomNav = NSView(frame: NSRect(x: 0, y: 0, width: windowWidth, height: navHeight))
        bottomNav.wantsLayer = true
        bottomNav.layer?.backgroundColor = NSColor(calibratedRed: 0.05, green: 0.05, blue: 0.07, alpha: 0.94).cgColor
        bottomNav.autoresizingMask = [.width, .maxYMargin]

        // 1px luminous top border
        let navBorder = NSView(frame: NSRect(x: 0, y: navHeight - 1, width: windowWidth, height: 1))
        navBorder.wantsLayer = true
        navBorder.layer?.backgroundColor = NSColor(calibratedWhite: 1.0, alpha: 0.08).cgColor
        navBorder.autoresizingMask = [.width, .minYMargin]
        bottomNav.addSubview(navBorder)

        let tabs = [
            ("heart", "Activity", #selector(selectActivityTab)),
            ("message", "Messages", #selector(selectMessagesTab)),
            ("person.crop.circle", "Profile", #selector(selectProfileTab)),
            ("gearshape", "Settings", #selector(selectSettingsTab))
        ]

        let tabWidth = windowWidth / CGFloat(tabs.count)
        for (index, tab) in tabs.enumerated() {
            let btn = NSButton(title: tab.1, target: self, action: tab.2)
            btn.frame = NSRect(x: CGFloat(index) * tabWidth + 4, y: 4, width: tabWidth - 8, height: 50)
            btn.bezelStyle = .regularSquare
            btn.isBordered = false
            btn.wantsLayer = true
            btn.layer?.cornerRadius = 14
            if let img = NSImage(systemSymbolName: tab.0, accessibilityDescription: tab.1) {
                let config = NSImage.SymbolConfiguration(pointSize: 18, weight: .medium)
                btn.image = img.withSymbolConfiguration(config)
                btn.imagePosition = .imageAbove
            }
            btn.contentTintColor = .white
            btn.autoresizingMask = [.width]
            bottomNav.addSubview(btn)
        }
        rootContainer.addSubview(bottomNav)

        // 3. Injected Engine Script
        let config = WKWebViewConfiguration()
        let userContentController = WKUserContentController()

        let cssShieldSource = """
        (function() {
            // Force strict viewport meta tag
            let meta = document.querySelector('meta[name="viewport"]');
            if (!meta) {
                meta = document.createElement('meta');
                meta.name = 'viewport';
                if (document.head) document.head.appendChild(meta);
            }
            if (meta) {
                meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
            }

            function injectResponsiveReelCSS() {
                if (document.getElementById('anchor-reel-ui-fix')) return;
                const style = document.createElement('style');
                style.id = 'anchor-reel-ui-fix';
                style.innerHTML = `
                    /* Force body and root containers to respect mobile width */
                    html, body, div[id^="mount_0_0_"], #mount_0_0_*, #react-root {
                        width: 100% !important;
                        max-width: 100vw !important;
                        height: 100% !important;
                        overflow-x: hidden !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    /* Contain Reel video viewports and modal overlays within screen dimensions (Reels only) */
                    div[role="dialog"]:has(video),
                    div[aria-modal="true"]:has(video),
                    div:has(> video) {
                        width: 100% !important;
                        max-width: 100vw !important;
                        height: 100% !important;
                        max-height: 100vh !important;
                        box-sizing: border-box !important;
                        margin: 0 auto !important;
                    }

                    /* Force Reels video element to fit completely inside viewport without cropping */
                    div[role="dialog"] video,
                    div[aria-modal="true"] video,
                    div:has(> video) > video {
                        object-fit: contain !important;
                        width: 100% !important;
                        height: 100% !important;
                        max-width: 100vw !important;
                        max-height: 100vh !important;
                    }

                    /* Keep controls and interaction buttons on reel dialogs within screen bounds */
                    div[role="dialog"] div[style*="bottom"] {
                        max-width: 100vw !important;
                        box-sizing: border-box !important;
                    }
                `;
                (document.head || document.documentElement).appendChild(style);
            }
            injectResponsiveReelCSS();

            function injectShield() {
                if (document.getElementById('anchor-shield-style')) return;
                const style = document.createElement('style');
                style.id = 'anchor-shield-style';
                style.innerHTML = `
                    /* Hide Reels & Explore everywhere */
                    a[href*="/reels"], a[href^="/reels"],
                    a[href*="/explore"], a[href^="/explore"],
                    a[aria-label*="Reels" i], a[aria-label*="Explore" i],
                    svg[aria-label*="Reels" i], svg[aria-label*="Explore" i],
                    svg[aria-label*="Clips" i],
                    div[data-testid="reels-tab"], div[data-testid="explore-tab"],
                    a[href="/"] svg[aria-label*="Home" i],
                    a[href="/"][role="link"],
                    svg[aria-label="Home" i],
                    div[data-testid="suggested_users_feed_unit"] {
                        display: none !important;
                        visibility: hidden !important;
                        pointer-events: none !important;
                        height: 0 !important;
                    }

                    /* Completely eradicate Instagram's web bottom navigation bar and all its lingering icons */
                    footer[role="contentinfo"],
                    nav[role="navigation"],
                    div[data-testid="bottom-nav"],
                    div[data-testid="mobile-nav-bar"],
                    div[data-testid="navigation-bar"],
                    div[data-testid="mobile_nav_bar"],
                    div[data-testid="tab-bar"],
                    div[data-testid="bottom_bar"],
                    div > nav[style*="bottom"],
                    /* Target any container wrapping Reels tab/button or Explore tab */
                    div:has(> a[href*="/reels/"]),
                    div:has(> a[href*="/explore/"]),
                    div:has(> a[aria-label*="Reels" i]),
                    div:has(> svg[aria-label*="Reels" i]),
                    div:has(> svg[aria-label*="Clips" i]),
                    /* Target mobile web bottom tray wrapper */
                    div[style*="position: fixed"][style*="bottom: 0"],
                    div[style*="position: fixed"][style*="bottom:0"],
                    div[style*="position:fixed"][style*="bottom: 0"],
                    div[style*="position:fixed"][style*="bottom:0"],
                    nav[style*="position: fixed"],
                    nav[style*="position:fixed"],
                    footer[style*="position: fixed"],
                    footer[style*="position:fixed"],
                    div[role="alert"],
                    div[role="status"],
                    div[class*="toast" i],
                    div[class*="Toast" i],
                    div[data-testid*="toast" i],
                    div[id*="toast" i] {
                        display: none !important;
                        visibility: hidden !important;
                        pointer-events: none !important;
                        height: 0 !important;
                        max-height: 0 !important;
                        overflow: hidden !important;
                        opacity: 0 !important;
                    }

                    /* Eradicate standalone Direct inbox tabs & messenger icons */
                    a[href="/direct/inbox/"], a[href*="/direct/inbox"],
                    a[href="/direct/"], a[href="/direct"],
                    svg[aria-label*="Direct" i], svg[aria-label*="Messenger" i] {
                        display: none !important;
                        visibility: hidden !important;
                        pointer-events: none !important;
                        height: 0 !important;
                    }

                    /* Eradicate Use the app banner, app download prompts, and bottom upsell cards */
                    div[data-testid*="app-upsell"],
                    div[data-testid*="open-in-app"],
                    div[data-testid*="smart-banner"],
                    div[role="banner"],
                    a[href*="instagram.com/download"],
                    a[href*="play.google.com"],
                    a[href*="apps.apple.com"],
                    a[href*="instagram://"],
                    .smartbanner,
                    [aria-label*="Use the app" i],
                    [aria-label*="Get the app" i],
                    [aria-label*="Open in app" i],
                    div[style*="position: fixed"][style*="bottom: 0"],
                    div[style*="position: fixed"][style*="bottom:0"],
                    div[style*="position:fixed"][style*="bottom: 0"],
                    div[style*="position:fixed"][style*="bottom:0"],
                    div[style*="bottom"][aria-label*="app" i] {
                        display: none !important;
                        opacity: 0 !important;
                        visibility: hidden !important;
                        pointer-events: none !important;
                        height: 0 !important;
                        max-height: 0 !important;
                    }

                    #anchor-exit {
                        position: fixed; top: 12px; left: 12px; z-index: 9999999;
                        background: #18181b; color: #fff; padding: 8px 16px;
                        border-radius: 20px; font-weight: bold; border: 1px solid #333;
                        cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                    }

                    /* Native Dark Theme Palette & Root Containers */
                    :root, html, body {
                        --primary-background: #000000 !important;
                        --secondary-background: #121212 !important;
                        --ig-primary-background: #000000 !important;
                        --ig-secondary-background: #121212 !important;
                        --ig-stroke: #262626 !important;
                        --card-background: #000000 !important;
                        color-scheme: dark !important;
                    }

                    html, body, #react-root, main[role="main"] {
                        background-color: #000000 !important;
                    }

                    /* HIDE SAVED / BOOKMARK TAB ON PROFILE PAGE */
                    a[href*="/saved/"],
                    div[role="tab"]:has(svg[aria-label="Saved"]),
                    div[role="tab"]:has(svg[aria-label*="Saved" i]),
                    svg[aria-label="Saved"],
                    svg[aria-label*="Saved" i] {
                        display: none !important;
                    }

                    /* DM Chat List Fixes & Input Dark Fix */
                    div[role="listbox"], div[role="list"], div[aria-label*="Direct" i] {
                        background-color: #000000 !important;
                    }

                    input, textarea, select {
                        background-color: #121212 !important;
                        border: 1px solid #262626 !important;
                        color: #FFFFFF !important;
                        border-radius: 8px !important;
                    }
                `;
                (document.head || document.documentElement).appendChild(style);
            }
            injectShield();
            document.addEventListener('DOMContentLoaded', injectShield);
        })();
        """
        let cssUserScript = WKUserScript(source: cssShieldSource, injectionTime: .atDocumentStart, forMainFrameOnly: false)
        userContentController.addUserScript(cssUserScript)

        let scriptSource = """
        (function() {
            // 1. Force strict viewport Meta Tag for exact device scaling
            let meta = document.querySelector('meta[name="viewport"]');
            if (!meta) {
                meta = document.createElement('meta');
                meta.name = 'viewport';
                if (document.head) document.head.appendChild(meta);
            }
            if (meta) {
                meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
            }

            // 2. Inject CSS rules to contain Reel video bounds and prevent edge cropping
            const injectResponsiveReelCSS = () => {
                if (document.getElementById('anchor-reel-ui-fix')) return;
                const style = document.createElement('style');
                style.id = 'anchor-reel-ui-fix';
                style.innerHTML = `
                    /* Force body and root containers to respect mobile width */
                    html, body, div[id^="mount_0_0_"], #mount_0_0_*, #react-root {
                        width: 100% !important;
                        max-width: 100vw !important;
                        height: 100% !important;
                        overflow-x: hidden !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    /* Contain Reel video viewports and modal overlays within screen dimensions */
                    div[role="dialog"]:has(video), 
                    section:has(video), 
                    main:has(video), 
                    article:has(video), 
                    div:has(> video) {
                        width: 100% !important;
                        max-width: 100vw !important;
                        height: 100% !important;
                        max-height: 100vh !important;
                        box-sizing: border-box !important;
                        margin: 0 auto !important;
                    }

                    /* Force Reels video element to fit completely inside viewport without cropping */
                    video {
                        object-fit: contain !important;
                        width: 100% !important;
                        height: 100% !important;
                        max-width: 100vw !important;
                        max-height: 100vh !important;
                    }

                    /* Keep controls and interaction buttons within screen bounds */
                    div[style*="bottom"] {
                        max-width: 100vw !important;
                        box-sizing: border-box !important;
                    }
                `;
                (document.head || document.documentElement).appendChild(style);
            };
            injectResponsiveReelCSS();

            // Re-apply shield if dynamically removed
            const style = document.createElement('style');
            style.innerHTML = `
                /* 1. Hide Reels & Explore navigation tabs and links */
                a[href*="/reels"], a[href^="/reels"],
                a[href*="/explore"], a[href^="/explore"],
                a[aria-label*="Reels" i], a[aria-label*="Explore" i],
                svg[aria-label*="Reels" i], svg[aria-label*="Explore" i],
                svg[aria-label*="Clips" i],
                div[data-testid="reels-tab"], div[data-testid="explore-tab"],
                a[href="/"] svg[aria-label*="Home" i],
                a[href="/"][role="link"],
                svg[aria-label="Home" i],
                div[data-testid="suggested_users_feed_unit"] {
                    display: none !important;
                    visibility: hidden !important;
                    pointer-events: none !important;
                    height: 0 !important;
                }

                /* 2. Completely eradicate Instagram's web bottom navigation bar, toast bar, and all its lingering icons */
                div[role="tablist"],
                [role="tablist"],
                footer[role="contentinfo"],
                nav[role="navigation"],
                div[data-testid="bottom-nav"],
                div[data-testid="mobile-nav-bar"],
                div[data-testid="navigation-bar"],
                div[data-testid="mobile_nav_bar"],
                div[data-testid="tab-bar"],
                div[data-testid="bottom_bar"],
                div > nav[style*="bottom"],
                /* Target any container wrapping Reels tab/button or Explore tab */
                div:has(> a[href*="/reels/"]),
                div:has(> a[href*="/explore/"]),
                div:has(> a[aria-label*="Reels" i]),
                div:has(> svg[aria-label*="Reels" i]),
                div:has(> svg[aria-label*="Clips" i]),
                /* Target mobile web bottom tray wrapper */
                div[style*="position: fixed"][style*="bottom: 0"],
                div[style*="position: fixed"][style*="bottom:0"],
                div[style*="position:fixed"][style*="bottom: 0"],
                div[style*="position:fixed"][style*="bottom:0"],
                nav[style*="position: fixed"],
                nav[style*="position:fixed"],
                footer[style*="position: fixed"],
                footer[style*="position:fixed"],
                div[role="alert"],
                div[role="status"],
                div[class*="toast" i],
                div[class*="Toast" i],
                div[data-testid*="toast" i],
                div[id*="toast" i] {
                    display: none !important;
                    visibility: hidden !important;
                    pointer-events: none !important;
                    height: 0 !important;
                    max-height: 0 !important;
                    overflow: hidden !important;
                    opacity: 0 !important;
                }

                /* 3. Eradicate standalone Direct inbox tabs & messenger icons */
                a[href="/direct/inbox/"], a[href*="/direct/inbox"],
                a[href="/direct/"], a[href="/direct"],
                svg[aria-label*="Direct" i], svg[aria-label*="Messenger" i] {
                    display: none !important;
                    visibility: hidden !important;
                    pointer-events: none !important;
                    height: 0 !important;
                }

                /* Strict Reel Overlay Isolation & Scroll Lock */
                html.anchor-reel-isolated,
                html.anchor-reel-isolated body,
                body.anchor-reel-isolated,
                body:has(a[href*="/reel/"]), body:has(a[href*="/reels/"]) {
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
            `;
            (document.head || document.documentElement).appendChild(style);

            // Fast Click Interceptor (checks string properties instantly, zero reflows)
            document.addEventListener('click', function(e) {
                const clickable = e.target.closest('a, button, [role="link"], [role="button"], [role="tab"]');
                if (clickable) {
                    const href = (clickable.getAttribute('href') || '').toLowerCase();
                    const aria = (clickable.getAttribute('aria-label') || '').toLowerCase();

                    // Never intercept clicks on settings, accounts, or accounts center
                    if (href.includes('accountscenter') || href.includes('/accounts') || href.includes('/settings') || href.includes('/privacy')) {
                        return;
                    }

                    const isReel = href.includes('/reels') || (aria.includes('reels') && !aria.includes('audio'));
                    const isExplore = href.includes('/explore') || aria.includes('explore');
                    const isExplicitHomeLink = (href === '/' || href === '/#') && aria === 'home';

                    if (isReel || isExplore || isExplicitHomeLink) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        window.location.replace('https://www.instagram.com/direct/inbox/');
                        return false;
                    }
                }
            }, true);

            // Eradication of Instagram Web Bottom Navigation / Toastbar
            function hideBottomNavs() {
                try {
                    const winHeight = window.innerHeight || document.documentElement.clientHeight || 800;

                    // A. Eradicate any toast notifications, alerts, or snackbar banners
                    document.querySelectorAll(
                        'div[role="alert"], div[role="status"], div[class*="toast" i], div[data-testid*="toast" i], div[id*="toast" i], div[class*="Toast" i]'
                    ).forEach(function(el) {
                        el.style.setProperty('display', 'none', 'important');
                        el.style.setProperty('visibility', 'hidden', 'important');
                        el.style.setProperty('pointer-events', 'none', 'important');
                        el.style.setProperty('height', '0px', 'important');
                        try { el.remove(); } catch(e) {}
                    });

                    // B. Direct Target: Instagram Mobile Web Bottom Navigation Tabs & Trays
                    const navTraySelectors = [
                        'div[role="tablist"]',
                        '[role="tablist"]',
                        'nav[role="navigation"]',
                        'footer[role="contentinfo"]',
                        'div[data-testid="bottom-nav"]',
                        'div[data-testid="mobile-nav-bar"]',
                        'div[data-testid="navigation-bar"]',
                        'div[data-testid="mobile_nav_bar"]',
                        'div[data-testid="tab-bar"]',
                        'div[data-testid="bottom_bar"]',
                        'nav[style*="bottom"]',
                        'footer'
                    ];

                    document.querySelectorAll(navTraySelectors.join(', ')).forEach(function(el) {
                        if (el.id === 'anchor-exit') return;
                        if (el.querySelector('input, textarea, form, [contenteditable="true"]')) return;

                        const rect = el.getBoundingClientRect();
                        if (rect.top <= 65 && rect.height <= 60 && !el.querySelector('a[href*="/direct/inbox"], a[href="/direct/inbox/"], svg[aria-label*="Direct" i]')) {
                            return;
                        }

                        if (el.getAttribute('role') === 'tablist' && el.querySelector('svg[aria-label*="Posts" i], svg[aria-label*="Grid" i], svg[aria-label*="Tagged" i]')) {
                            return;
                        }

                        el.style.setProperty('display', 'none', 'important');
                        el.style.setProperty('visibility', 'hidden', 'important');
                        el.style.setProperty('pointer-events', 'none', 'important');
                        el.style.setProperty('height', '0px', 'important');
                        el.style.setProperty('max-height', '0px', 'important');
                        el.style.setProperty('overflow', 'hidden', 'important');
                        try { el.remove(); } catch(e) {}
                    });

                    // B2. Eradicate any tray or parent containing Reels, Explore, or Home navigation icons
                    document.querySelectorAll(
                        'a[href*="/reels/"], a[href^="/reels"], a[aria-label*="Reels" i], svg[aria-label*="Reels" i], svg[aria-label*="Clips" i], a[href*="/explore/"], a[aria-label*="Explore" i], svg[aria-label*="Explore" i]'
                    ).forEach(function(el) {
                        let cur = el;
                        let navBar = null;
                        while (cur && cur !== document.body && cur !== document.documentElement) {
                            const comp = window.getComputedStyle(cur);
                            if (comp.position === 'fixed' || comp.position === 'sticky') {
                                navBar = cur;
                                break;
                            }
                            if (cur.getAttribute('role') === 'tablist' || cur.tagName.toLowerCase() === 'nav' || cur.tagName.toLowerCase() === 'footer') {
                                navBar = cur;
                                break;
                            }
                            cur = cur.parentElement;
                        }

                        if (navBar && !navBar.querySelector('input, textarea, form, [contenteditable="true"]')) {
                            navBar.style.setProperty('display', 'none', 'important');
                            navBar.style.setProperty('visibility', 'hidden', 'important');
                            navBar.style.setProperty('pointer-events', 'none', 'important');
                            navBar.style.setProperty('height', '0px', 'important');
                            navBar.style.setProperty('max-height', '0px', 'important');
                            navBar.style.setProperty('overflow', 'hidden', 'important');
                            try { navBar.remove(); } catch(e) {}
                        } else {
                            const btn = el.closest('a, div[role="button"]') || el;
                            btn.style.setProperty('display', 'none', 'important');
                            btn.style.setProperty('visibility', 'hidden', 'important');
                            btn.style.setProperty('pointer-events', 'none', 'important');
                            try { btn.remove(); } catch(e) {}
                        }
                    });

                    // C. Eradicate any container holding Direct Message icon or inbox link
                    document.querySelectorAll(
                        'a[href="/direct/inbox/"], a[href="/direct/inbox"], a[href="/direct/"], a[href="/direct"], svg[aria-label*="Direct" i], svg[aria-label*="Messenger" i], svg[aria-label*="Chats" i]'
                    ).forEach(function(el) {
                        const r = el.getBoundingClientRect();
                        if (r.top <= 65 && (el.getAttribute('aria-label') || '').toLowerCase().includes('back')) return;
                        if (el.closest('header')) return;

                        let cur = el;
                        let tray = null;
                        while (cur && cur !== document.body && cur !== document.documentElement) {
                            const comp = window.getComputedStyle(cur);
                            if (comp.position === 'fixed' || comp.position === 'sticky') {
                                tray = cur;
                                break;
                            }
                            if (cur.getAttribute('role') === 'tablist' || cur.tagName.toLowerCase() === 'nav' || cur.tagName.toLowerCase() === 'footer') {
                                tray = cur;
                                break;
                            }
                            cur = cur.parentElement;
                        }

                        if (tray && !tray.querySelector('input, textarea, form, [contenteditable="true"]')) {
                            tray.style.setProperty('display', 'none', 'important');
                            tray.style.setProperty('visibility', 'hidden', 'important');
                            tray.style.setProperty('pointer-events', 'none', 'important');
                            tray.style.setProperty('height', '0px', 'important');
                            try { tray.remove(); } catch(e) {}
                        } else {
                            const link = el.closest('a, div[role="button"]') || el;
                            link.style.setProperty('display', 'none', 'important');
                            link.style.setProperty('visibility', 'hidden', 'important');
                            link.style.setProperty('pointer-events', 'none', 'important');
                            try { link.remove(); } catch(e) {}
                        }
                    });

                    // D. Target bottom avatar tab in bottom navigation bar (Strictly skip profile page header/bio avatar)
                    document.querySelectorAll('img[alt*="profile picture" i]').forEach(function(img) {
                        if (img.closest('header') || img.closest('main') || img.closest('section')) {
                            if (img.getBoundingClientRect().top < (winHeight - 90)) return;
                        }

                        let cur = img;
                        let tray = null;
                        while (cur && cur !== document.body && cur !== document.documentElement) {
                            const comp = window.getComputedStyle(cur);
                            if ((comp.position === 'fixed' || comp.position === 'sticky') && cur.getBoundingClientRect().top > (winHeight - 90)) {
                                tray = cur;
                                break;
                            }
                            if ((cur.getAttribute('role') === 'tablist' || cur.getAttribute('role') === 'tab') && cur.getBoundingClientRect().top > (winHeight - 90)) {
                                tray = cur;
                                break;
                            }
                            cur = cur.parentElement;
                        }
                        if (tray && !tray.querySelector('input, textarea, form, [contenteditable="true"], video')) {
                            if (tray.getAttribute('role') !== 'dialog' && tray.getAttribute('aria-modal') !== 'true' && !tray.closest('header')) {
                                tray.style.setProperty('display', 'none', 'important');
                                tray.style.setProperty('visibility', 'hidden', 'important');
                                tray.style.setProperty('pointer-events', 'none', 'important');
                                try { tray.remove(); } catch(e) {}
                            }
                        }
                    });

                    // E. Geometric Bottom Bar Eradication (catches all fixed/sticky bottom bars)
                    document.querySelectorAll('div, footer, nav, [role="navigation"], [role="tablist"]').forEach(function(el) {
                        if (el.id === 'anchor-exit') return;
                        if (el.querySelector('input, textarea, form, [contenteditable="true"], video')) return;
                        if (el.getAttribute('role') === 'dialog' || el.getAttribute('aria-modal') === 'true') return;

                        const comp = window.getComputedStyle(el);
                        if (comp.position === 'fixed' || comp.position === 'sticky') {
                            const rect = el.getBoundingClientRect();
                            if (rect.height >= 20 && rect.height <= 120 && rect.top > 65) {
                                if (rect.bottom >= winHeight - 140 || rect.top >= winHeight * 0.4) {
                                    el.style.setProperty('display', 'none', 'important');
                                    el.style.setProperty('visibility', 'hidden', 'important');
                                    el.style.setProperty('pointer-events', 'none', 'important');
                                    el.style.setProperty('height', '0px', 'important');
                                    el.style.setProperty('max-height', '0px', 'important');
                                    try { el.remove(); } catch(e) {}
                                }
                            }
                        }
                    });

                    // F. Remove any lingering indicator lines / pill bars at the bottom
                    document.querySelectorAll('div, span').forEach(function(el) {
                        if (el.id === 'anchor-exit') return;
                        const rect = el.getBoundingClientRect();
                        if (rect.width >= 15 && rect.width <= 80 && rect.height >= 2 && rect.height <= 8) {
                            if (rect.bottom >= winHeight - 100) {
                                el.remove();
                            }
                        }
                    });

                    // 5. Eradicate "Use the app" banner and app download upsells
                    const allLinks = document.querySelectorAll('a, button, span, div');
                    for (let i = 0; i < allLinks.length; i++) {
                        const el = allLinks[i];
                        const text = (el.innerText || el.textContent || '').toLowerCase();
                        if (text.includes('use the app') || text.includes('open in app') || text.includes('get the app')) {
                            let parent = el;
                            for (let d = 0; d < 6; d++) {
                                if (!parent || parent === document.body || parent === document.documentElement || parent.tagName === 'MAIN') break;
                                const comp = window.getComputedStyle(parent);
                                if (comp.position === 'fixed' || comp.position === 'sticky' || parent.getAttribute('role') === 'dialog' || parent.getAttribute('role') === 'banner') {
                                    parent.remove();
                                    break;
                                }
                                parent = parent.parentElement;
                            }
                        }
                    }

                    // 6. Clear Instagram bottom spacer on body/main
                    if (document.body) document.body.style.setProperty('padding-bottom', '0px', 'important');
                    if (document.documentElement) document.documentElement.style.setProperty('padding-bottom', '0px', 'important');
                    const mainEl = document.querySelector('main');
                    if (mainEl) mainEl.style.setProperty('padding-bottom', '0px', 'important');
                } catch(e) {}
            }

            // Extract logged-in username
            function detectUsername() {
                const ignored = ['direct', 'inbox', 'messages', 'instagram', 'search', 'notifications', 'activity', 'cancel', 'edit', 'settings', 'options', 'requests', 'chats', 'notes', 'explore', 'reels', 'accounts', 'stories', 'legal', 'privacy', 'about', 'p', 'reel'];

                // 1. Scan avatar link in bottom bar or page
                const avatarLink = document.querySelector('a[href^="/"] img[alt*="profile picture" i]')?.closest('a') ||
                                   document.querySelector('a[href^="/"][role="link"] img')?.closest('a');
                if (avatarLink && avatarLink.getAttribute('href')) {
                    const href = avatarLink.getAttribute('href').replace(/^\\/+|\\/+$/g, '');
                    if (href && !href.includes('/') && !ignored.includes(href.toLowerCase())) {
                        window.__ANCHOR_USERNAME__ = href;
                        try { window.webkit.messageHandlers.anchor.postMessage({ type: "USER", username: href }); } catch(e) {}
                        return;
                    }
                }

                // 2. Scan top bar elements (specifically requires chevron ∨ for account switcher)
                const topCandidates = document.querySelectorAll('button, span, h1, h2, h3, div[role="button"], div[role="heading"]');
                for (let i = 0; i < topCandidates.length; i++) {
                    const el = topCandidates[i];
                    const rect = el.getBoundingClientRect();
                    if (rect.top <= 90 && rect.height > 0 && rect.height <= 60) {
                        const clean = raw.split('\\n')[0].replace(/[∨⌄▼v\\s]/g, '');
                        if (/^[a-zA-Z0-9._]{3,30}$/.test(clean) && !ignored.includes(clean.toLowerCase())) {
                            window.__ANCHOR_USERNAME__ = clean;
                            try { window.webkit.messageHandlers.anchor.postMessage({ type: "USER", username: clean }); } catch(e) {}
                            return;
                        }
                    }
                }

                // 3. Scan window._sharedData and __initialData
                if (window._sharedData?.config?.viewer?.username) {
                    const u = window._sharedData.config.viewer.username;
                    window.__ANCHOR_USERNAME__ = u;
                    try { window.webkit.messageHandlers.anchor.postMessage({ type: "USER", username: u }); } catch(e) {}
                    return;
                }
                if (window.__initialData?.data?.viewer?.username) {
                    const u = window.__initialData.data.viewer.username;
                    window.__ANCHOR_USERNAME__ = u;
                    try { window.webkit.messageHandlers.anchor.postMessage({ type: "USER", username: u }); } catch(e) {}
                    return;
                }

                // 4. Scan localStorage for username
                try {
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        const val = localStorage.getItem(key);
                        if (val && val.includes('username')) {
                            const match = val.match(/"username"\\s*:\\s*"([a-zA-Z0-9._]{3,30})"/);
                            if (match && match[1] && !ignored.includes(match[1].toLowerCase())) {
                                window.__ANCHOR_USERNAME__ = match[1];
                                try { window.webkit.messageHandlers.anchor.postMessage({ type: "USER", username: match[1] }); } catch(e) {}
                                return;
                            }
                        }
                    }
                } catch(e) {}

                // 5. Fallback to avatar alt
                const avatar = document.querySelector('img[alt*="profile picture" i]');
                if (avatar) {
                    const match = (avatar.alt || '').match(/^([^'’]+)['’]s profile picture/i);
                    if (match && match[1] && !ignored.includes(match[1].toLowerCase())) {
                        window.__ANCHOR_USERNAME__ = match[1];
                        try { window.webkit.messageHandlers.anchor.postMessage({ type: "USER", username: match[1] }); } catch(e) {}
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

            function enforceRules() {
                if (isAllowedUtilityRoute()) {
                    hideBottomNavs();
                    detectUsername();
                    return;
                }

                const host = (window.location.hostname || '').toLowerCase();
                const p = (window.location.pathname || '').toLowerCase();

                const isInstagramMain = host.includes('instagram.com') && !host.includes('accountscenter');
                const isHome = isInstagramMain && (p === '/' || p === '/#' || p === '');
                const isExplore = p === '/explore' || p.startsWith('/explore');

                if (isExplore || isHome) {
                    window.location.replace('https://www.instagram.com/direct/inbox/');
                    return;
                }

                hideBottomNavs();
                detectUsername();
                injectResponsiveReelCSS();
                applyReelIsolation();
                applyReelStyles();
                enforceSingleReelDOM();
            }

            // 8. Strict Reel Isolation & Infinite Scroll Eradication Engine
            function extractReelIdFromUrl(url) {
                if (!url) return null;
                const m = url.toString().match(/\\/(reels?|p)\\/([A-Za-z0-9_-]+)/i);
                return m ? m[2] : null;
            }

            let activeIsolatedReelId = null;

            function isReelOverlay() {
                const p = (window.location.pathname || '').toLowerCase();
                if (p.includes('/reel') || p.startsWith('/p/')) {
                    return true;
                }
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
                            try { window.webkit.messageHandlers.anchor.postMessage({ type: 'RETURN_TO_MESSAGES' }); } catch(err) {}
                            return;
                        }
                    } else if (activeIsolatedReelId && (urlStr.includes('/reels') || urlStr.includes('/explore'))) {
                        try { window.webkit.messageHandlers.anchor.postMessage({ type: 'RETURN_TO_MESSAGES' }); } catch(err) {}
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
                            try { window.webkit.messageHandlers.anchor.postMessage({ type: 'RETURN_TO_MESSAGES' }); } catch(err) {}
                            return;
                        }
                    }
                }
                return origReplaceState.apply(this, arguments);
            };

            // A. Disable vertical CSS scroll-snapping globally on Reel viewports
            const applyReelStyles = () => {
                const isReel = window.location.pathname.includes('/reel/') || window.location.pathname.includes('/reels/');
                const existing = document.getElementById('anchor-reel-lock-css');
                if (!isReel) {
                    if (existing) existing.remove();
                    return;
                }
                if (existing) return;
                const style = document.createElement('style');
                style.id = 'anchor-reel-lock-css';
                style.innerHTML = `
                    /* Kill scroll snap containers on reel screens */
                    html, body, main, section, div[role="dialog"] {
                        scroll-snap-type: none !important;
                        overscroll-behavior-y: none !important;
                        touch-action: pan-x !important;
                    }

                    /* Hide all swipe indicator arrows and next reel preloader containers */
                    div[role="button"]:has(svg[aria-label="Down chevron"]),
                    div[role="button"]:has(svg[aria-label="Up chevron"]),
                    button[aria-label="Next Reel"],
                    button[aria-label="Previous Reel"] {
                        display: none !important;
                        visibility: hidden !important;
                        pointer-events: none !important;
                    }
                `;
                (document.head || document.documentElement).appendChild(style);
            };

            // B. Aggressive Capture-Phase Touch Blocker
            let startY = 0;
            
            window.addEventListener('touchstart', (e) => {
                if (e.touches && e.touches.length > 0) {
                    startY = e.touches[0].clientY;
                }
            }, { capture: true, passive: true });

            window.addEventListener('touchmove', (e) => {
                const isReel = window.location.pathname.includes('/reel/') || window.location.pathname.includes('/reels/');
                if (isReel && e.touches && e.touches.length > 0) {
                    const currentY = e.touches[0].clientY;
                    const deltaY = Math.abs(currentY - startY);

                    // Trap vertical movement greater than 10px to stop swipe-down gestures completely
                    if (deltaY > 10) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        return false;
                    }
                }
            }, { capture: true, passive: false });

            // Block mouse/wheel scrolling for emulator/desktop previews
            window.addEventListener('wheel', (e) => {
                const isReel = window.location.pathname.includes('/reel/') || window.location.pathname.includes('/reels/');
                if (isReel) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }, { capture: true, passive: false });

            // C. Observer to re-apply locks on SPA route changes
            let lastPath = window.location.pathname;
            const routeObserver = new MutationObserver(() => {
                if (window.location.pathname !== lastPath) {
                    lastPath = window.location.pathname;
                    applyReelStyles();
                }
            });

            applyReelStyles();
            routeObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });

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
            }, { capture: true });

            // 3. DOM NUKER: REMOVE NEXT REEL SIBLING NODES
            const enforceSingleReelDOM = () => {
                const isReel = window.location.pathname.includes('/reel/') || 
                               window.location.pathname.includes('/reels/') ||
                               window.location.pathname.startsWith('/reel') ||
                               window.location.pathname.startsWith('/p/');
                if (!isReel) return;

                const videoElements = document.querySelectorAll('video');
                if (videoElements.length > 1) {
                    for (let i = 1; i < videoElements.length; i++) {
                        const extraReel = videoElements[i].closest('article') || videoElements[i].closest('div[role="dialog"]');
                        if (extraReel && extraReel.parentNode) {
                            extraReel.parentNode.removeChild(extraReel);
                        }
                    }
                }
            };

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
                                    try { window.webkit.messageHandlers.anchor.postMessage({ type: 'RETURN_TO_MESSAGES' }); } catch(err) {}
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
                        btn.style.cssText = 'position: fixed !important; top: 70px !important; left: 14px !important; z-index: 2147483647 !important; background: rgba(15, 23, 42, 0.95) !important; color: #ffffff !important; border: 1px solid rgba(255, 255, 255, 0.35) !important; border-radius: 20px !important; padding: 8px 16px !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important; font-size: 13px !important; font-weight: 700 !important; cursor: pointer !important; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.75) !important; backdrop-filter: blur(8px) !important; display: flex !important; align-items: center !important; gap: 6px !important; pointer-events: auto !important;';
                        btn.onclick = function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            activeIsolatedReelId = null;
                            try { window.webkit.messageHandlers.anchor.postMessage({ type: 'RETURN_TO_MESSAGES' }); } catch(err) {}
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

            enforceRules();

            // Lightweight throttled observer (no setInterval polling)
            let isThrottled = false;
            const obs = new MutationObserver(function() {
                if (!isThrottled) {
                    isThrottled = true;
                    setTimeout(function() {
                        isThrottled = false;
                        enforceRules();
                    }, 100);
                }
            });
            obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
            setInterval(enforceSingleReelDOM, 500);
        })();
        """

        let userScript = WKUserScript(source: scriptSource, injectionTime: .atDocumentEnd, forMainFrameOnly: false)
        userContentController.addUserScript(userScript)
        userContentController.add(self, name: "anchor")
        config.userContentController = userContentController
        config.websiteDataStore = WKWebsiteDataStore.default()

        // 4. Mobile WebView
        let webFrame = NSRect(x: 0, y: navHeight, width: windowWidth, height: windowHeight - headerHeight - navHeight)
        webView = WKWebView(frame: webFrame, configuration: config)
        webView.autoresizingMask = [.width, .height]
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.customUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"

        rootContainer.addSubview(webView)
        window.contentView = rootContainer

        // Load Initial Tab (or URL argument)
        var initialUrl = "https://www.instagram.com/direct/inbox/"
        if CommandLine.arguments.count > 1 && !CommandLine.arguments[1].isEmpty {
            let arg = CommandLine.arguments[1]
            if arg.starts(with: "http") {
                initialUrl = arg
            } else {
                initialUrl = "https://www.instagram.com/\(arg)/"
            }
        }
        if let url = URL(string: initialUrl) {
            webView.load(URLRequest(url: url))
        }

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func extractReelId(from url: URL) -> String? {
        let path = url.path
        let components = path.split(separator: "/")
        if let idx = components.firstIndex(where: { $0 == "reel" || $0 == "reels" || $0 == "p" }), idx + 1 < components.count {
            return String(components[idx + 1])
        }
        return nil
    }

    func returnToMessages() {
        self.activeTargetReelId = nil
        self.activeReelUrl = nil
        self.currentTab = "messages"
        let targetUrl = self.lastChatUrl.isEmpty ? "https://www.instagram.com/direct/inbox/" : self.lastChatUrl
        if let url = URL(string: targetUrl) {
            self.webView.load(URLRequest(url: url))
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }

        // Only guard main-frame navigations
        guard navigationAction.targetFrame?.isMainFrame ?? true else {
            decisionHandler(.allow)
            return
        }

        let host = (url.host ?? "").lowercased()
        let path = url.path.lowercased()
        let full = url.absoluteString.lowercased()

        // 1. Direct message navigation tracking & allow accounts center / settings / auth / api
        if host.contains("accountscenter") ||
           full.contains("accountscenter") ||
           host.contains("meta.com") ||
           path.contains("/accounts") ||
           path.contains("/settings") ||
           path.contains("/privacy") ||
           path.contains("/security") ||
           path.contains("/help") ||
           path.contains("/about") ||
           path.contains("/direct/") ||
           path.contains("/api/") {
            if path.contains("/direct/") {
                self.lastChatUrl = url.absoluteString
            }
            self.activeTargetReelId = nil
            self.activeReelUrl = nil
            decisionHandler(.allow)
            return
        }

        // 2. Strict Reel overlay isolation guard (matches /reel/<id>/, /reels/<id>/, and /p/<id>/)
        if let reelId = extractReelId(from: url) {
            let fullUrl = url.absoluteString
            if let locked = self.activeReelUrl {
                if fullUrl != locked {
                    decisionHandler(.cancel)
                    DispatchQueue.main.async { [weak self] in
                        self?.webView.evaluateJavaScript("window.location.href = '\(locked)';")
                    }
                    return
                }
            } else {
                self.activeReelUrl = fullUrl
                self.activeTargetReelId = reelId
            }
            decisionHandler(.allow)
            return
        }

        // 3. Block plural /reels feed (without specific id) and /explore
        if path.hasPrefix("/reels") || path.hasPrefix("/explore") {
            decisionHandler(.cancel)
            DispatchQueue.main.async { [weak self] in
                self?.returnToMessages()
            }
            return
        }

        decisionHandler(.allow)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if let dict = message.body as? [String: Any], let type = dict["type"] as? String {
            if type == "RETURN_TO_MESSAGES" {
                returnToMessages()
                return
            }
            if type == "USER", let username = dict["username"] as? String {
                let lower = username.lowercased()
                let blacklist = ["back", "direct", "inbox", "messages", "settings", "cancel", "edit", "activity", "search", "home", "reels", "explore"]
                if !blacklist.contains(lower) && username.count >= 3 {
                    self.detectedUsername = username
                    UserDefaults.standard.set(username, forKey: "anchor_saved_username")
                }
            }
        }
    }

    @objc func goBack() {
        if self.activeTargetReelId != nil {
            returnToMessages()
            return
        }
        if webView.canGoBack {
            webView.goBack()
        }
    }

    @objc func reloadPage() {
        webView.reload()
    }

    @objc func openInstagramSettings() {
        if let url = URL(string: "https://www.instagram.com/accounts/settings/") {
            webView.load(URLRequest(url: url))
        }
    }

    @objc func selectActivityTab() {
        self.activeTargetReelId = nil
        if self.currentTab == "activity" {
            return
        }
        self.currentTab = "activity"
        let js = """
        (function() {
            window.__ANCHOR_ACTIVE_TAB__ = 'activity';
            const heart = document.querySelector('svg[aria-label*="Activity" i], svg[aria-label*="Notification" i], a[href*="/activity"]')?.closest('a, button, div[role="button"]');
            if (heart) {
                heart.click();
            } else {
                window.location.href = 'https://www.instagram.com/?activity=1';
            }
        })();
        """
        webView.evaluateJavaScript(js, completionHandler: nil)
    }

    @objc func selectMessagesTab() {
        self.activeTargetReelId = nil
        if self.currentTab == "messages" {
            return
        }
        self.currentTab = "messages"
        let js = """
        (function() {
            window.__ANCHOR_ACTIVE_TAB__ = 'messages';
            if (window.location.pathname !== '/direct/inbox/' && window.location.pathname !== '/direct/inbox') {
                window.location.href = 'https://www.instagram.com/direct/inbox/';
            }
        })();
        """
        webView.evaluateJavaScript(js, completionHandler: nil)
    }

    func promptForUsername(defaultVal: String? = nil) {
        let alert = NSAlert()
        alert.messageText = "👤 Set Profile Username"
        alert.informativeText = "Enter your exact Instagram username to link the Profile tab:"
        let input = NSTextField(frame: NSRect(x: 0, y: 0, width: 240, height: 26))
        input.stringValue = defaultVal ?? ""
        input.placeholderString = "e.g. ishant_verma"
        alert.accessoryView = input
        alert.addButton(withTitle: "Open Profile")
        alert.addButton(withTitle: "Cancel")
        let resp = alert.runModal()
        if resp == .alertFirstButtonReturn {
            let entered = input.stringValue.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "@", with: "")
            if !entered.isEmpty {
                self.detectedUsername = entered
                UserDefaults.standard.set(entered, forKey: "anchor_saved_username")
                let navJs = "window.location.href = 'https://www.instagram.com/\(entered)/';"
                self.webView.evaluateJavaScript(navJs, completionHandler: nil)
            }
        }
    }

    @objc func selectProfileTab() {
        self.activeTargetReelId = nil
        self.currentTab = "profile"
        if let user = self.detectedUsername, !user.isEmpty {
            if let url = URL(string: "https://www.instagram.com/\(user)/") {
                webView.load(URLRequest(url: url))
                return
            }
        }
        let js = """
        (function() {
            let username = window.__ANCHOR_USERNAME__ || null;
            if (!username) {
                try {
                    const userMeta = document.querySelector('meta[property="al:ios:url"]');
                    if (userMeta && userMeta.content) {
                        username = userMeta.content.split('user?username=')[1];
                    }
                } catch(e) {}
            }
            if (!username) {
                const topCandidates = document.querySelectorAll('header span, header h1, header button span, header div[role="button"]');
                const ignored = ['direct', 'inbox', 'messages', 'instagram', 'search', 'notifications', 'activity', 'cancel', 'edit', 'settings', 'options', 'requests', 'chats', 'notes', 'explore', 'reels', 'accounts', 'stories'];
                for (let i = 0; i < topCandidates.length; i++) {
                    const clean = (topCandidates[i].textContent || '').trim().split('\\n')[0].replace(/[∨⌄▼\\s]/g, '');
                    if (/^[a-zA-Z0-9._]{3,30}$/.test(clean) && !ignored.includes(clean.toLowerCase())) {
                        username = clean;
                        break;
                    }
                }
            }
            if (!username) {
                const avatar = document.querySelector('a[href^="/"] img[alt*="profile picture" i]')?.closest('a') ||
                               document.querySelector('a[aria-label*="Profile" i]');
                if (avatar && avatar.getAttribute('href')) {
                    username = avatar.getAttribute('href').replace(/\\//g, '').split('?')[0];
                }
            }
            if (username && !username.includes('accounts') && !username.includes('edit')) {
                window.location.href = 'https://www.instagram.com/' + username + '/';
            } else {
                const profileBtn = document.querySelector('a[href^="/"] img[alt*="profile picture" i]')?.closest('a') ||
                                   document.querySelector('a[aria-label*="Profile" i]');
                if (profileBtn) {
                    profileBtn.click();
                } else {
                    window.location.href = 'https://www.instagram.com/';
                }
            }
        })();
        """
        webView.evaluateJavaScript(js, completionHandler: nil)
    }

    @objc func selectSettingsTab() {
        self.activeTargetReelId = nil
        if self.currentTab == "settings" {
            return
        }
        self.currentTab = "settings"
        let js = """
        (function() {
            var gear = document.querySelector('svg[aria-label*="Options" i], svg[aria-label*="Settings" i], a[href*="/accounts/settings/"]');
            var gearBtn = gear ? gear.closest('a, button, div[role="button"]') : null;
            if (gearBtn) {
                gearBtn.click();
            } else {
                window.location.href = 'https://www.instagram.com/accounts/settings/';
            }
        })();
        """
        webView.evaluateJavaScript(js, completionHandler: nil)
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
