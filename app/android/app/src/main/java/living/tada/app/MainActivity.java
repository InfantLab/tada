package living.tada.app;

import android.os.Bundle;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Allow cookies from cross-origin responses (e.g. session cookies
        // from tada.living when the WebView origin is app.tada.living).
        // CapacitorHttp (enabled in capacitor.config.ts) already routes
        // requests through native networking, but this flag ensures the
        // WebView's own CookieManager also accepts them.
        CookieManager.getInstance().setAcceptThirdPartyCookies(
            getBridge().getWebView(), true
        );
        // Pin text zoom to 100% — Android font-size accessibility setting otherwise
        // bleeds into the WebView and makes all text too large.
        getBridge().getWebView().getSettings().setTextZoom(100);
        // Forward WebView console.log/warn/error to adb logcat under tag "TadaJS".
        // Without this override, WebView JavaScript output is completely invisible
        // to logcat — it only appears in Chrome Remote Debugging (chrome://inspect).
        getBridge().getWebView().setWebChromeClient(
            new BridgeWebChromeClient(getBridge()) {
                @Override
                public boolean onConsoleMessage(ConsoleMessage cm) {
                    String msg = cm.message()
                        + " (" + cm.sourceId() + ":" + cm.lineNumber() + ")";
                    switch (cm.messageLevel()) {
                        case ERROR:   Log.e("TadaJS", msg); break;
                        case WARNING: Log.w("TadaJS", msg); break;
                        default:      Log.d("TadaJS", msg); break;
                    }
                    return super.onConsoleMessage(cm);
                }
            }
        );
    }
}
