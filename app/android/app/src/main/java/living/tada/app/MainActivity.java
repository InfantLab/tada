package living.tada.app;

import android.os.Bundle;
import android.webkit.CookieManager;
import com.getcapacitor.BridgeActivity;

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
    }
}
