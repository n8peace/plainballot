import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const spec = JSON.parse(readFileSync('public/openapi.json', 'utf8'));
const route = readFileSync('app/api/ballot/route.ts', 'utf8');
const types = readFileSync('lib/types.ts', 'utf8');

describe('openapi.json', () => {
  const get = spec.paths['/api/ballot'].get;
  it('documents the address parameter with the route limits', () => {
    const p = get.parameters[0];
    expect(p.name).toBe('address');
    expect(route).toContain(`address.length < ${p.schema.minLength}`);
    expect(route).toContain(`address.length > ${p.schema.maxLength}`);
  });
  it('documents every status the route can return', () => {
    for (const code of [200, 400, 404, 429, 502, 503]) {
      expect(get.responses[String(code)], String(code)).toBeDefined();
      if (code !== 200) expect(route).toContain(String(code));
    }
  });
  it('lists every field of Ballot, Contest, Choice and Stance', () => {
    const iface = (name: string) => types.split(`export interface ${name} {`)[1].split('\n}')[0];
    const fields = (name: string) => [...iface(name).matchAll(/^\s{2}(\w+)\??:/gm)].map((m) => m[1]);
    for (const name of ['Ballot', 'Contest', 'Choice', 'Stance']) {
      const documented = Object.keys(spec.components.schemas[name].properties);
      for (const f of fields(name)) expect(documented, `${name}.${f}`).toContain(f);
    }
  });
  it('is linked from the AI-readable page', () => {
    expect(readFileSync('public/llms.txt', 'utf8')).toContain('https://plainballot.com/openapi.json');
  });
});
