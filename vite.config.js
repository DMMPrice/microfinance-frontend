import {defineConfig} from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import {fileURLToPath} from "url";
import {componentTagger} from "lovable-tagger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({mode}) => {
    const isDev = mode === "development";

    return {
        server: {
            host: "::",
            port: 8080,
        },

        plugins: [
            react(),
            // Only use this in dev to avoid extra overhead in production
            isDev && componentTagger(),
        ].filter(Boolean),

        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },

        esbuild: {
            jsx: "automatic",
            jsxDev: isDev,
            minifyIdentifiers: !isDev,
            minifySyntax: !isDev,
            minifyWhitespace: !isDev,
        },

        build: {
            target: "es2017",
            minify: "esbuild",
            sourcemap: isDev,
            cssCodeSplit: true,
            chunkSizeWarningLimit: 1000,
            rollupOptions: {
                output: {
                    manualChunks: {
                        vendor: ["react", "react-dom", "react-router-dom"],
                    },
                },
            },
        },

        optimizeDeps: {
            include: ["react", "react-dom", "react-router-dom"],
        },

        define: {
            "process.env.NODE_ENV": JSON.stringify(mode),
        },
    };
});
