import Cocoa
import WebKit

class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    var window: NSWindow!
    var webView: WKWebView!
    var currentTab = "messages"
    var titleLabel: NSTextField!
    var detectedUsername: String? = nil

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

        let scriptSource = """
        (function() {
            // CSS Shield
            const style = document.createElement('style');
            style.innerHTML = `
                /* Hide Reels & Explore everywhere */
                a[href*="/reels/"], a[href*="/explore/"],
                a[aria-label*="Reels" i], a[aria-label*="Explore" i],
                svg[aria-label*="Reels" i], svg[aria-label*="Explore" i],
                div[data-testid="reels-tab"], div[data-testid="explore-tab"],
                a[href="/"] svg[aria-label*="Home" i],
                div[data-testid="suggested_users_feed_unit"] {
                    display: none !important;
                }

                /* Hide Instagram's built-in web bottom bar so Anchor native bar is sole bar */
                div[role="tablist"],
                div > nav[style*="bottom: 0"],
                div > nav[style*="bottom:0"],
                div[style*="position: fixed"][style*="bottom: 0px"],
                div[style*="position: fixed"][style*="bottom:0px"],
                footer[role="contentinfo"] {
                    display: none !important;
                }

                #anchor-exit {
                    position: fixed; top: 12px; left: 12px; z-index: 9999999;
                    background: #18181b; color: #fff; padding: 8px 16px;
                    border-radius: 20px; font-weight: bold; border: 1px solid #333;
                    cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                }
            `;
            (document.head || document.documentElement).appendChild(style);

            // Continuously hide any fixed bottom navigation from Instagram (without hiding message inputs)
            function hideBottomNavs() {
                document.querySelectorAll('div, nav, footer').forEach(function(el) {
                    const style = window.getComputedStyle(el);
                    if (style.position === 'fixed' || style.position === 'sticky') {
                        const rect = el.getBoundingClientRect();
                        if (rect.bottom >= window.innerHeight - 15 && rect.height > 25 && rect.height < 85) {
                            const hasInput = el.querySelector('input, textarea, [contenteditable="true"]');
                            if (!hasInput) {
                                el.style.setProperty('display', 'none', 'important');
                            }
                        }
                    }
                });
            }

            // Extract logged-in username
            function detectUsername() {
                // Try from header title or buttons (e.g. "jack_98472 ∨")
                const headerText = document.querySelector('header h2, header h1, header button span, main header h2');
                if (headerText && headerText.innerText) {
                    const cleanName = headerText.innerText.split('\\n')[0].replace('∨', '').trim();
                    if (cleanName && !cleanName.includes(' ') && cleanName.length > 2) {
                        window.__ANCHOR_USERNAME__ = cleanName;
                        try { window.webkit.messageHandlers.anchor.postMessage({ type: "USER", username: cleanName }); } catch(e) {}
                        return;
                    }
                }
                // Try from avatar links
                const avatar = document.querySelector('a[href^="/"] img[alt*="profile picture" i]')?.closest('a');
                if (avatar) {
                    const path = avatar.getAttribute('href')?.replace(/^\\/+|\\/+$/g, '');
                    if (path && !path.includes('/') && !['direct', 'explore', 'reels', 'accounts'].includes(path.toLowerCase())) {
                        window.__ANCHOR_USERNAME__ = path;
                        try { window.webkit.messageHandlers.anchor.postMessage({ type: "USER", username: path }); } catch(e) {}
                    }
                }
            }

            function enforceRules() {
                const p = window.location.pathname;
                // Allow authentication & settings & profile views
                if (p.includes('/accounts/login') || p.includes('/challenge') || p.includes('/two_factor')) return;

                // Intercept Root Home & General Explore/Reels
                if (p === '/' || p === '/#' || p === '' || p.startsWith('/explore/') || p === '/reels' || p === '/reels/') {
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
            setInterval(enforceRules, 400);
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
                self.detectedUsername = username
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
        // Direct open Instagram Account Settings
        if let url = URL(string: "https://www.instagram.com/accounts/settings/") {
            webView.load(URLRequest(url: url))
        }
    }

    @objc func selectActivityTab() {
        if let url = URL(string: "https://www.instagram.com/accounts/activity/") {
            webView.load(URLRequest(url: url))
        }
    }

    @objc func selectMessagesTab() {
        if let url = URL(string: "https://www.instagram.com/direct/inbox/") {
            webView.load(URLRequest(url: url))
        }
    }

    @objc func selectProfileTab() {
        // Must ALWAYS open user profile page, NEVER edit profile!
        let js = """
        (function() {
            // 1. If username was detected, go directly to /username/
            if (window.__ANCHOR_USERNAME__) {
                window.location.href = 'https://www.instagram.com/' + window.__ANCHOR_USERNAME__ + '/';
                return;
            }
            // 2. Click avatar link
            const avatar = document.querySelector('a[href^="/"] img[alt*="profile picture" i]')?.closest('a');
            if (avatar && avatar.getAttribute('href')) {
                const path = avatar.getAttribute('href').replace(/^\\/+|\\/+$/g, '');
                if (path && !path.includes('/')) {
                    window.location.href = 'https://www.instagram.com/' + path + '/';
                    return;
                }
            }
            // 3. Fallback: try finding profile button
            const profBtn = document.querySelector('a[aria-label*="Profile" i]');
            if (profBtn && profBtn.href) {
                window.location.href = profBtn.href;
                return;
            }
        })();
        """
        webView.evaluateJavaScript(js, completionHandler: nil)
    }

    @objc func selectSettingsTab() {
        let alert = NSAlert()
        alert.messageText = "⚓ Anchor & Instagram Settings"
        alert.informativeText = """
        User: @\(detectedUsername ?? "Logged In")

        • Algorithmic Feeds: BLOCKED 🛡️
        • Infinite Reels: ISOLATED 🔒
        • Explore Search Grid: FILTERED 🚫
        • Direct Messages: UNRESTRICTED 💬

        Choose an action:
        """
        alert.addButton(withTitle: "Open Instagram Account Settings ⚙️")
        alert.addButton(withTitle: "Close")
        alert.addButton(withTitle: "Clear Cache & Log Out")

        let response = alert.runModal()
        if response == .alertFirstButtonReturn {
            // Load Instagram Account Settings in the web view!
            openInstagramSettings()
        } else if response == .alertThirdButtonReturn {
            let dataTypes = WKWebsiteDataStore.allWebsiteDataTypes()
            WKWebsiteDataStore.default().removeData(ofTypes: dataTypes, modifiedSince: Date.distantPast) {
                if let url = URL(string: "https://www.instagram.com/accounts/login/") {
                    self.webView.load(URLRequest(url: url))
                }
            }
        }
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
