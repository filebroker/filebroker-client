import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function normalizeBasePath(path: string | undefined): string {
    if (!path || path === "." || path === "/") {
        return "/";
    }

    if (path === "./") {
        return "./";
    }

    return `/${path.replace(/^\/+|\/+$/g, "")}/`;
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), ["VITE_", "REACT_APP_", "PUBLIC_URL"]);

    const basePath = normalizeBasePath(env.PUBLIC_URL || env.REACT_APP_PATH || env.VITE_APP_PATH);

    return {
        plugins: [react()],
        envPrefix: ["VITE_", "REACT_APP_"],
        base: basePath,
        server: {
            port: 3000,
        },
        build: {
            outDir: "build",
        },
    };
});
