import Cocoa
import WebKit

class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    var window: NSWindow!
    var webView: WKWebView!
    var currentTab = "messages"
    var titleLabel: NSTextField!
    var detectedUsername: String? = UserDefaults.standard.string(forKey: "anchor_saved_username")

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

        // Header Right: Action Buttons in an NSStackView
        let actionsStack = NSStackView()
        actionsStack.orientation = .horizontal
        actionsStack.alignment = .centerY
        actionsStack.spacing = 6
        actionsStack.frame = NSRect(x: windowWidth - 116, y: 0, width: 104, height: headerHeight)
        actionsStack.autoresizingMask = [.minXMargin, .height]

        func makeHeaderButton(title: String, action: Selector, tip: String) -> NSButton {
            let btn = NSButton(title: title, target: self, action: action)
            btn.translatesAutoresizingMaskIntoConstraints = false
            btn.widthAnchor.constraint(equalToConstant: 28).isActive = true
            btn.heightAnchor.constraint(equalToConstant: 28).isActive = true
            btn.bezelStyle = .regularSquare
            btn.isBordered = false
            btn.wantsLayer = true
            btn.layer?.backgroundColor = NSColor(calibratedRed: 0.12, green: 0.12, blue: 0.14, alpha: 1.0).cgColor
            btn.layer?.cornerRadius = 14
            btn.layer?.borderWidth = 1
            btn.layer?.borderColor = NSColor(calibratedRed: 0.20, green: 0.20, blue: 0.22, alpha: 1.0).cgColor
            btn.contentTintColor = .white
            btn.toolTip = tip
            return btn
        }

        let igSettingsBtn = makeHeaderButton(title: "⚙️", action: #selector(openInstagramSettings), tip: "Instagram Account Settings")
        actionsStack.addArrangedSubview(igSettingsBtn)

        let backButton = makeHeaderButton(title: "◀", action: #selector(goBack), tip: "Back")
        actionsStack.addArrangedSubview(backButton)

        let reloadButton = makeHeaderButton(title: "↻", action: #selector(reloadPage), tip: "Reload")
        actionsStack.addArrangedSubview(reloadButton)

        headerView.addSubview(actionsStack)

        rootContainer.addSubview(headerView)

        // 2. Bottom 4-Tab Navigation Bar
        let navHeight: CGFloat = 60
        let bottomNav = NSView(frame: NSRect(x: 0, y: 0, width: windowWidth, height: navHeight))
        bottomNav.wantsLayer = true
        bottomNav.layer?.backgroundColor = NSColor(calibratedRed: 0.04, green: 0.04, blue: 0.04, alpha: 1.0).cgColor
        bottomNav.autoresizingMask = [.width, .maxYMargin]

        let tabs = [
            ("🔔", "Activity", #selector(selectActivityTab)),
            ("💬", "Messages", #selector(selectMessagesTab)),
            ("👤", "Profile", #selector(selectProfileTab)),
            ("⚙️", "Settings", #selector(selectSettingsTab))
        ]

        let tabWidth = windowWidth / CGFloat(tabs.count)
        for (index, tab) in tabs.enumerated() {
            let btn = NSButton(title: "\(tab.0)\n\(tab.1)", target: self, action: tab.2)
            btn.frame = NSRect(x: CGFloat(index) * tabWidth + 4, y: 6, width: tabWidth - 8, height: 48)
            btn.bezelStyle = .regularSquare
            btn.isBordered = false
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
                    div[data-testid="suggested_users_feed_unit"],

                    /* Completely eradicate Instagram's web bottom navigation bar and all its lingering icons */
                    a[href="/direct/inbox/"], a[href*="/direct/inbox"],
                    svg[aria-label*="Direct" i], svg[aria-label*="Messenger" i],
                    div[role="tablist"],
                    footer[role="contentinfo"],
                    nav[role="navigation"],
                    nav,
                    footer,
                    div:has(> a[href*="/direct/inbox"]),
                    div:has(> * > a[href*="/direct/inbox"]),
                    div:has(> * > * > a[href*="/direct/inbox"]),
                    div:has(> * > * > * > a[href*="/direct/inbox"]),
                    div:has(> a[href*="/reels"]),
                    div:has(> * > a[href*="/reels"]),
                    div:has(> * > * > a[href*="/reels"]),
                    div:has(> * > * > * > a[href*="/reels"]),
                    div > nav[style*="bottom"],
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

                    #anchor-exit {
                        position: fixed; top: 12px; left: 12px; z-index: 9999999;
                        background: #18181b; color: #fff; padding: 8px 16px;
                        border-radius: 20px; font-weight: bold; border: 1px solid #333;
                        cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
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
            // Re-apply shield if dynamically removed
            const style = document.createElement('style');
            style.innerHTML = `
                a[href*="/reels"], a[href^="/reels"],
                a[href*="/explore"], a[href^="/explore"],
                a[aria-label*="Reels" i], a[aria-label*="Explore" i],
                svg[aria-label*="Reels" i], svg[aria-label*="Explore" i],
                svg[aria-label*="Clips" i],
                div[data-testid="reels-tab"], div[data-testid="explore-tab"],
                a[href="/"] svg[aria-label*="Home" i],
                a[href="/"][role="link"],
                svg[aria-label="Home" i],
                div[data-testid="suggested_users_feed_unit"],
                a[href="/direct/inbox/"], a[href*="/direct/inbox"],
                svg[aria-label*="Direct" i], svg[aria-label*="Messenger" i],
                div[role="tablist"], footer[role="contentinfo"], nav[role="navigation"], nav, footer,
                div:has(> a[href*="/direct/inbox"]),
                div:has(> * > a[href*="/direct/inbox"]),
                div:has(> * > * > a[href*="/direct/inbox"]),
                div:has(> a[href*="/reels"]),
                div:has(> * > a[href*="/reels"]),
                div:has(> * > * > a[href*="/reels"]),
                div > nav[style*="bottom"] {
                    display: none !important;
                    visibility: hidden !important;
                    pointer-events: none !important;
                    height: 0 !important;
                }
            `;
            (document.head || document.documentElement).appendChild(style);

            // Fast Click Interceptor (checks string properties instantly, zero reflows)
            document.addEventListener('click', function(e) {
                const clickable = e.target.closest('a, button, [role="link"], [role="button"], [role="tab"]');
                if (clickable) {
                    const href = (clickable.getAttribute('href') || '').toLowerCase();
                    const aria = (clickable.getAttribute('aria-label') || '').toLowerCase();

                    const isReel = href.includes('/reels') || aria.includes('reels') || aria.includes('clips');
                    const isExplore = href.includes('/explore') || aria.includes('explore');
                    const isHome = ((href === '/' || href === '/#' || href === '') || aria === 'home') && !href.includes('/direct/');

                    if (isReel || isExplore || isHome) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        window.location.replace('https://www.instagram.com/direct/inbox/');
                        return false;
                    }
                }
            }, true);

            // Complete Eradication of Instagram Web Bottom Navigation / Toastbar
            function hideBottomNavs() {
                try {
                    // A. Remove any semantic navigation, footer, tablist, or element with bottom:0 in style
                    document.querySelectorAll('nav, footer, [role="navigation"], [role="tablist"], div[style*="bottom"]').forEach(function(el) {
                        if (el.id === 'anchor-exit') return;
                        if (el.querySelector('input, textarea, [contenteditable="true"]')) return;
                        el.remove();
                    });

                    // B. Climb up from any triggers to find their outer fixed/sticky container and remove it
                    const triggers = document.querySelectorAll(
                        'a[href*="/direct/inbox"], a[href*="/reels"], a[href*="/explore"], a[href="/"], svg[aria-label*="Direct" i], svg[aria-label*="Messenger" i], svg[aria-label*="Reels" i], svg[aria-label*="Clips" i]'
                    );
                    triggers.forEach(function(el) {
                        let cur = el;
                        let containerToRemove = null;
                        while (cur && cur !== document.body && cur !== document.documentElement) {
                            const comp = window.getComputedStyle(cur);
                            if (comp.position === 'fixed' || comp.position === 'sticky') {
                                containerToRemove = cur;
                            }
                            cur = cur.parentElement;
                        }
                        if (containerToRemove) {
                            containerToRemove.remove();
                        } else {
                            el.remove();
                        }
                    });

                    // C. Scan outer DOM levels (body > div, body > div > div, etc.) for any fixed bar sitting at the bottom
                    const outerContainers = document.querySelectorAll(
                        'body > div, body > div > div, body > div > div > div, body > div > div > div > div, body > div > div > div > div > div, main ~ div'
                    );
                    for (let i = 0; i < outerContainers.length; i++) {
                        const el = outerContainers[i];
                        if (el.id === 'anchor-exit') continue;
                        if (el.querySelector('input, textarea, [contenteditable="true"]')) continue;

                        const comp = window.getComputedStyle(el);
                        if (comp.position === 'fixed' || comp.position === 'sticky') {
                            const rect = el.getBoundingClientRect();
                            if (rect.height > 0 && rect.height <= 140 && rect.width >= window.innerWidth * 0.4) {
                                if (rect.bottom >= window.innerHeight - 80) {
                                    el.remove();
                                }
                            }
                        }
                    }

                    // D. Remove any lingering indicator lines / pill bars at the bottom
                    document.querySelectorAll('div, span').forEach(function(el) {
                        if (el.id === 'anchor-exit') return;
                        const rect = el.getBoundingClientRect();
                        if (rect.width >= 15 && rect.width <= 80 && rect.height >= 2 && rect.height <= 8) {
                            if (rect.bottom >= window.innerHeight - 80) {
                                el.remove();
                            }
                        }
                    });

                    // E. Eradicate "Use the app" banner and app download upsells
                    const allLinks = document.querySelectorAll('a, button, span, div');
                    for (let i = 0; i < allLinks.length; i++) {
                        const el = allLinks[i];
                        const text = (el.innerText || el.textContent || '').trim().toLowerCase();
                        if (text === 'use the app' || text === 'open in app' || text === 'get the app') {
                            let parent = el;
                            while (parent && parent !== document.body && parent !== document.documentElement) {
                                const comp = window.getComputedStyle(parent);
                                if (comp.position === 'fixed' || comp.position === 'sticky') {
                                    parent.remove();
                                    break;
                                }
                                parent = parent.parentElement;
                            }
                            if (parent && parent !== document.body) {
                                parent.remove();
                            }
                        }
                    }

                    // F. Clear Instagram bottom spacer on body/main
                    if (document.body) document.body.style.setProperty('padding-bottom', '0px', 'important');
                    const mainEl = document.querySelector('main');
                    if (mainEl) mainEl.style.setProperty('padding-bottom', '0px', 'important');
                } catch(e) {}
            }

            // Extract logged-in username
            function detectUsername() {
                // 1. Scan top bar elements (specifically requires chevron ∨ for account title)
                const topCandidates = document.querySelectorAll('button, span, h1, h2, h3, div[role="button"], div[role="heading"]');
                for (let i = 0; i < topCandidates.length; i++) {
                    const el = topCandidates[i];
                    const rect = el.getBoundingClientRect();
                    if (rect.top <= 90 && rect.height > 0 && rect.height <= 60) {
                        const raw = (el.innerText || el.textContent || '').trim();
                        // Only match if it has the downward chevron of the account switcher or is not a UI keyword
                        const hasChevron = raw.includes('∨') || raw.includes('⌄') || raw.includes('▼');
                        const clean = raw.split('\\n')[0].replace(/[∨⌄▼v\\s]/g, '');
                        const blacklist = ['back', 'direct', 'inbox', 'messages', 'instagram', 'search', 'notifications', 'activity', 'cancel', 'edit', 'settings', 'options', 'requests', 'chats', 'notes'];
                        if (/^[a-zA-Z0-9._]{3,30}$/.test(clean) && !blacklist.includes(clean.toLowerCase())) {
                            if (hasChevron || clean === 'jack_98472') {
                                window.__ANCHOR_USERNAME__ = clean;
                                try { window.webkit.messageHandlers.anchor.postMessage({ type: "USER", username: clean }); } catch(e) {}
                                return;
                            }
                        }
                    }
                }

                // 2. Scan localStorage for username
                try {
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        const val = localStorage.getItem(key);
                        if (val && val.includes('username')) {
                            const match = val.match(/"username"\\s*:\\s*"([a-zA-Z0-9._]{3,30})"/);
                            if (match && match[1] && !['direct', 'explore', 'reels'].includes(match[1].toLowerCase())) {
                                window.__ANCHOR_USERNAME__ = match[1];
                                try { window.webkit.messageHandlers.anchor.postMessage({ type: "USER", username: match[1] }); } catch(e) {}
                                return;
                            }
                        }
                    }
                } catch(e) {}

                // 3. Fallback to avatar alt
                const avatar = document.querySelector('img[alt*="profile picture" i]');
                if (avatar) {
                    const match = (avatar.alt || '').match(/^([^'’]+)['’]s profile picture/i);
                    if (match && match[1]) {
                        window.__ANCHOR_USERNAME__ = match[1];
                        try { window.webkit.messageHandlers.anchor.postMessage({ type: "USER", username: match[1] }); } catch(e) {}
                    }
                }
            }

            function enforceRules() {
                const p = window.location.pathname;
                // Allow authentication & settings & profile views
                if (p.includes('/accounts/login') || p.includes('/challenge') || p.includes('/two_factor')) return;

                // Intercept Root Home, Plural Reels, and Explore
                const isReels = p.startsWith('/reels');
                const isExplore = p === '/explore' || p.startsWith('/explore');
                const isHome = p === '/' || p === '/#' || p === '';

                if (isReels || isExplore || isHome) {
                    window.location.replace('https://www.instagram.com/direct/inbox/');
                    return;
                }

                // DM Reel Overlay
                if (p.startsWith('/reel/') || p.startsWith('/p/')) {
                    if (!document.getElementById('anchor-exit')) {
                        const b = document.createElement('button');
                        b.id = 'anchor-exit';
                        b.innerHTML = '⚓ Back to Messages';
                        b.onclick = () => window.location.replace('https://www.instagram.com/direct/inbox/');
                        document.body.appendChild(b);
                    }
                }

                hideBottomNavs();
                detectUsername();
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

        // Load Default Tab: Messages (/direct/inbox/)
        if let url = URL(string: "https://www.instagram.com/direct/inbox/") {
            webView.load(URLRequest(url: url))
        }

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if let dict = message.body as? [String: Any], let type = dict["type"] as? String {
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
        let js = "if (!window.location.pathname.includes('/activity')) { window.location.href = 'https://www.instagram.com/accounts/activity/'; }"
        webView.evaluateJavaScript(js, completionHandler: nil)
    }

    @objc func selectMessagesTab() {
        let js = "if (window.location.pathname !== '/direct/inbox/' && window.location.pathname !== '/direct/inbox') { window.location.href = 'https://www.instagram.com/direct/inbox/'; }"
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
        let user = self.detectedUsername ?? "jack_98472"
        if let url = URL(string: "https://www.instagram.com/\(user)/") {
            webView.load(URLRequest(url: url))
        }
    }

    @objc func selectSettingsTab() {
        if let url = URL(string: "https://www.instagram.com/accounts/settings/") {
            webView.load(URLRequest(url: url))
        }
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
