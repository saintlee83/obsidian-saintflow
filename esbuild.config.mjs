import esbuild from "esbuild";
import builtins from "builtin-modules";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));

// 설계안 9장: vault의 .obsidian/plugins/saintflow/ 에 직접 빌드합니다.
// vault 경로는 SAINTFLOW_VAULT로 바꿀 수 있습니다. 기본값은 이 저장소 옆의 SaintFlow vault입니다.
const vault = resolve(here, process.env.SAINTFLOW_VAULT ?? join("..", "SaintFlow"));
const outDir = join(vault, ".obsidian", "plugins", "saintflow");
const production = process.argv[2] === "production";

if (!existsSync(vault)) {
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
	console.log(`빌드 완료: ${outDir}`);
	process.exit(0);
} else {
	await context.watch();
}
