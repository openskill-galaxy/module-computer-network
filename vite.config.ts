import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 项目站点 module-computer-network，部署在子路径 /module-computer-network/，base 必须设置
export default defineConfig({
  base: "/module-computer-network/",
  plugins: [
    react(),
    {
      name: "offline-release",
      apply: "build",
      writeBundle(options, bundle) {
        const out = options.dir!;
        const published = (dir: string) => readdirSync(join(out, dir))
          .filter((name) => name.endsWith(".json"))
          .map((name) => dir + "/" + name);
        const files = [...Object.keys(bundle), ...published("data"), "manifest.json", "favicon.svg"].sort();
        const file = (name: string) => readFileSync(join(out, name));
        const worker = file("sw.js").toString();
        const hash = createHash("sha256").update(worker);
        for (const name of files) hash.update(name).update(file(name));
        const revision = hash.digest("hex").slice(0, 16);
        writeFileSync(join(out, "sw.js"), worker
          .replace("__BUILD_REVISION__", revision)
          .replace("/* build:offline-files */ []", JSON.stringify(files)));
      },
    },
  ],
  esbuild: {
    drop: ["console", "debugger"],
  },
  build: {
    outDir: "dist",
    target: "es2020",
    minify: "esbuild",
    cssCodeSplit: true,
    reportCompressedSize: false,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react-router") ||
            id.includes("node_modules/scheduler")
          ) {
            return "vendor";
          }
          if (id.includes("node_modules/fuse.js")) {
            return "fuse";
          }
        },
      },
    },
  },
});
