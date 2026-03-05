import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: function (id) {
                    if (!id.includes("node_modules"))
                        return undefined;
                    if (id.includes("/three/"))
                        return "vendor-three";
                    if (id.includes("/react/") || id.includes("/react-dom/"))
                        return "vendor-react";
                    return "vendor";
                },
            },
        },
    },
    test: {
        environment: "jsdom",
        globals: true,
        include: ["src/**/*.test.ts"],
        pool: "forks",
        poolOptions: {
            forks: {
                singleFork: true,
            },
        },
    },
});
