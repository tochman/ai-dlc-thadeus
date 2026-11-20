// US-1402 BR6.6, NFR3.1: spies on every fs write call (promise and callback/sync forms), for the read-only tests.
import { vi } from 'vitest';
import fsSync, { promises as fs } from 'node:fs';

const NAMES = ['writeFile', 'rename', 'mkdir', 'rm', 'rmdir', 'unlink', 'appendFile', 'copyFile', 'symlink', 'chmod', 'truncate'];

/** Starts the spies; `calls()` gives the write calls made since, `open` counted only with a write flag. Call `restore()` after. */
export function spyWrites() {
  const spies = [
    ...NAMES.map((n) => vi.spyOn(fs, n)),
    ...NAMES.flatMap((n) => [vi.spyOn(fsSync, n), vi.spyOn(fsSync, `${n}Sync`)]),
    vi.spyOn(fsSync, 'createWriteStream')
  ];
  const opens = [vi.spyOn(fs, 'open'), vi.spyOn(fsSync, 'open'), vi.spyOn(fsSync, 'openSync')];
  const isWrite = (flag) => flag !== undefined && flag !== 'r' && flag !== fsSync.constants.O_RDONLY && typeof flag !== 'function';
  return {
    calls: () => [...spies.flatMap((s) => s.mock.calls), ...opens.flatMap((s) => s.mock.calls.filter((c) => isWrite(c[1])))],
    restore: () => [...spies, ...opens].forEach((s) => s.mockRestore())
  };
}
