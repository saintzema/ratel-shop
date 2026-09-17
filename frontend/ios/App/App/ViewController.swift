import UIKit
import WebKit
import Capacitor

// Capacitor's stock CAPBridgeViewController never implements WKUIDelegate's
// media-capture permission callback. Without it, WKWebView treats EVERY
// getUserMedia() call as unsupported — not merely "denied" — regardless of
// NSCameraUsageDescription already being set in Info.plist: the JS-side
// check `navigator.mediaDevices?.getUserMedia` comes back undefined, which
// is exactly the "This browser doesn't support camera access" message the
// QR scan page (a remote page loaded over https, not the local bundle) was
// showing on a real device with a real, working camera. Subclassing here to
// grant capture requests is the documented fix — see WKUIDelegate's
// webView(_:requestMediaCapturePermissionFor:initiatedByFrame:type:decisionHandler:).
class ViewController: CAPBridgeViewController, WKUIDelegate {
    override func viewDidLoad() {
        super.viewDidLoad()
        self.webView?.uiDelegate = self
    }

    @available(iOS 15.0, *)
    func webView(
        _ webView: WKWebView,
        requestMediaCapturePermissionFor origin: WKSecurityOrigin,
        initiatedByFrame frame: WKFrameInfo,
        type: WKMediaCaptureType,
        decisionHandler: @escaping (WKPermissionDecision) -> Void
    ) {
        // Only fairprice.ng ever runs in this WebView (see capacitor.config.ts's
        // allowNavigation allowlist) — safe to grant camera/mic capture outright
        // rather than adding a second, redundant native prompt on top of the
        // OS-level NSCameraUsageDescription one iOS already shows.
        decisionHandler(.grant)
    }
}
