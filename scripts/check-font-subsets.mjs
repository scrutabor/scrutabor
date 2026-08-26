import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const candidates =
	process.platform === 'win32'
		? ['.venv/Scripts/python.exe', 'python']
		: ['.venv/bin/python', 'python3'];
const interpreter = candidates.find((candidate) => existsSync(candidate)) ?? candidates.at(-1);
const result = spawnSync(interpreter, ['scripts/check-font-subsets.py'], { stdio: 'inherit' });

if (result.error) {
	console.error(`could not run ${interpreter}: ${result.error.message}`);
	process.exitCode = 1;
} else {
	process.exitCode = result.status ?? 1;
}
