import esbuild from "esbuild";
import builtins from "builtin-modules";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));

// Build locally by default. Set SAINTFLOW_VAULT to install the build into a vault.
const vault = process.env.SAINTFLOW_VAULT ? resolve(here, process.env.SAINTFLOW_VAULT) : null;
const outDir = vault ? join(vault, ".obsidian", "plugins", "saintflow") : join(here, "dist");
const production = process.argv[2] === "production";

if (vault && !existsSync(vault)) {
	console.error(`vault를 찾지 못했습니다: ${vault}`);
	console.error("SAINTFLOW_VAULT 환경 변수로 경로를 지정하세요.");
	process.exit(1);
}

mkdirSync(outDir, { recursive: true });
copyFileSync(join(here, "manifest.json"), join(outDir, "manifest.json"));
copyFileSync(join(here, "styles.css"), join(outDir, "styles.css"));

const context = await esbuild.context({
	entryPoints: [join(here, "main.ts")],
	bundle: true,
	external: ["obsidian", "electron", ...builtins],
	format: "cjs",
	target: "es2020",
	logLevel: "info",
	sourcemap: production ? false : "inline",
	treeShaking: true,
	minify: production,
	outfile: join(outDir, "main.js"),
});

if (production) {
	await context.rebuild();
	await context.dispose();
	console.log(`빌드 완료: ${outDir}`);
	process.exit(0);
} else {
	await context.watch();
}
