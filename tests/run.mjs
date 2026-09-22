import { build } from "esbuild";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { spawnSync } from "node:child_process";

const tempRoot = resolve(tmpdir());
const temp = mkdtempSync(join(tempRoot, "saintflow-tests-"));
try {
	const suite = join(temp, "runtime.cjs");
	await build({ entryPoints: ["tests/runtime-suite.ts"], outfile: suite, bundle: true, platform: "node", format: "cjs", logLevel: "silent",
		plugins: [{ name: "obsidian-test-doubles", setup(build) {
			build.onResolve({ filter: /^obsidian$/ }, () => ({ path: resolve("tests/obsidian-mock.ts") }));
			build.onResolve({ filter: /\/ui\/modals$/ }, () => ({ path: resolve("tests/modals-mock.ts") }));
		} }],
	});
	const uiSuite = join(temp, "ui.cjs");
	await build({ entryPoints: ["tests/ui-suite.ts"], outfile: uiSuite, bundle: true, platform: "node", format: "cjs", logLevel: "silent",
		plugins: [{ name: "obsidian-ui-double", setup(build) {
			build.onResolve({ filter: /^obsidian$/ }, () => ({ path: resolve("tests/obsidian-mock.ts") }));
		} }],
	});
	const tests = readdirSync("tests").filter(name => name.endsWith(".test.ts")).map(name => join("tests", name));
	const result = spawnSync(process.execPath, ["--import", "tsx", "--test", ...tests, suite, uiSuite], { stdio: "inherit" });
	process.exitCode = result.status ?? 1;
} finally {
	if (dirname(resolve(temp)) !== tempRoot || !temp.startsWith(join(tempRoot, "saintflow-tests-"))) throw new Error("Unexpected temporary directory");
	rmSync(temp, { recursive: true, force: true });
}
