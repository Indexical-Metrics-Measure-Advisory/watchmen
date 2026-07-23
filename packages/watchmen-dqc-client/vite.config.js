import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// https://vitejs.dev/config/
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), "");
    // Sub-path where the app is served when deployed behind the gateway
    // (e.g. "/dqc"). Falls back to root for standalone deployment.
    var webContext = env.VITE_WEB_CONTEXT || "/";
    // Dev-server proxy targets. The DQC API is served by watchmen-rest-dqc
    // (default http://localhost:8001); login/token/topic/user endpoints are
    // served by watchmen-rest-doll (default http://localhost:8000).
    // Used only when the corresponding VITE_*_API_URL is left empty so the
    // frontend calls same-origin relative paths (see src/utils/utils.ts).
    var dqcApiUrl = env.VITE_DQC_API_URL || "http://localhost:8001";
    var authApiUrl = env.VITE_AUTH_API_URL || "http://localhost:8000";
    return {
        base: webContext.endsWith("/") ? webContext : "".concat(webContext, "/"),
        server: {
            host: "::",
            port: 8081,
            proxy: {
                "/dqc": { target: dqcApiUrl, changeOrigin: true },
                "/login": { target: authApiUrl, changeOrigin: true },
                "/token": { target: authApiUrl, changeOrigin: true },
                "/topic": { target: authApiUrl, changeOrigin: true },
                "/user": { target: authApiUrl, changeOrigin: true },
            },
        },
        plugins: [react()],
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
    };
});
