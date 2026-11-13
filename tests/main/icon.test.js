import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('build/icon.png (FR3.1, FR3.5)', () => {
  it('is a 1024x1024 RGBA PNG', () => {
    const png = readFileSync(path.resolve(__dirname, '../../build/icon.png'));
    expect(png.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
    expect(png.toString('latin1', 12, 16)).toBe('IHDR');
    expect(png.readUInt32BE(16)).toBe(1024); // width
    expect(png.readUInt32BE(20)).toBe(1024); // height
    expect(png[25]).toBe(6); // colour type 6 = truecolour with alpha
  });
});
