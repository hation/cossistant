import { execSync } from "node:child_process";

const run = (command) => {
	console.log(`$ ${command}`);
	execSync(command, { stdio: "inherit", env: process.env });
};

try {
	run("bunx --bun changeset version");
	run("bun install");
} catch (error) {
	console.error("changeset-version failed");
	process.exitCode = 1;
	throw error;
}
