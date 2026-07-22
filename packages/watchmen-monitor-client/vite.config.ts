import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	// Sub-path where the app is served when deployed behind the gateway
	// (e.g. "/monitor"). Falls back to root for standalone deployment.
	const webContext = env.VITE_WEB_CONTEXT || "/";
	return {
		base: webContext.endsWith("/") ? webContext : `${webContext}/`,
		server: {
			host: "::",
			port: 8080,
		},
		plugins: [react()],
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src"),
			},
		},
	};
});
