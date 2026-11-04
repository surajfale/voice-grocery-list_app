import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');

const csp = () => {
  const match = read('netlify.toml').match(/Content-Security-Policy = "([^"]+)"/);
  return match ? match[1] : '';
};

describe('Netlify Content-Security-Policy', () => {
  it('allows every inline script in index.html by hash (update netlify.toml when one changes)', () => {
    const scripts = [...read('index.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(scripts.length).toBeGreaterThan(0);
    scripts.forEach((body) => {
      const hash = `'sha256-${createHash('sha256').update(body).digest('base64')}'`;
      expect(csp()).toContain(hash);
    });
  });

  it('does not allow inline or eval scripts in general', () => {
    const scriptSrc = csp().split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src'));
    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(csp()).toContain("frame-ancestors 'none'");
    expect(csp()).toContain("object-src 'none'");
  });
});
