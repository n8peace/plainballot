import { describe, expect, it } from 'vitest';
import { htmlToMarkdown, markdownPagePath, markdownUrl } from '../lib/markdown';

const PAGE = `<!doctype html><html><head><title>Kentucky races · Plain Ballot</title><script>var x = 1</script></head><body>
<header><h1><button>Plain Ballot</button></h1><button aria-label="Dark mode">☀</button></header>
<main>
  <h2>Kentucky races</h2>
  <form><input name="address" placeholder="Your street address"><button type="submit">See my ballot</button></form>
  <div class="row"><span>Rob Bonta</span><span>No public position found</span></div>
  <span role="img" aria-label="Tom Brandt: Strongly for lower taxes"><i></i><i></i></span>
  <div aria-hidden="true">lower taxes neither more services</div>
  <p hidden>secret draft</p>
  <blockquote>“Exact words.”</blockquote>
  <p>Source: <a href="/r/ky~state/x">latimes.com</a> · <a href="https://example.gov/page">example.gov</a></p>
  <svg><text>chart junk</text></svg><style>.a{}</style>
</main></body></html>`;

describe('htmlToMarkdown', () => {
  const md = htmlToMarkdown(PAGE, 'https://plainballot.com/races/kentucky');

  it('keeps every visible word, including button labels', () => {
    for (const w of ['Plain Ballot', 'Kentucky races', 'See my ballot', '“Exact words.”', 'lower taxes neither more services']) expect(md).toContain(w);
    // A label people don't see is not added.
    expect(md).not.toContain('Strongly for');
  });

  it('keeps side-by-side pieces apart', () => {
    expect(md).toContain('Rob Bonta No public position found');
  });

  it('leaves out code, hidden parts, text fields and icon-only buttons', () => {
    for (const w of ['var x', 'secret draft', 'chart junk', '☀', '.a{}', 'Your street address']) expect(md).not.toContain(w);
  });

  it('makes every link absolute and keeps sources as the page shows them', () => {
    expect(md).toContain('[latimes.com](https://plainballot.com/r/ky~state/x)');
    expect(md).toContain('[example.gov](https://example.gov/page)');
  });

  it('adds no words of its own', () => {
    const words = (t: string) => t.toLowerCase().match(/[\p{L}\p{N}’']+/gu) ?? [];
    const source = new Set([...words(PAGE.replace(/https?:\/\/\S+?(?=["<])/g, '')), 'https', 'plainballot', 'com', 'r', 'ky', 'state', 'x', 'example', 'gov', 'page']);
    const extra = words(md).filter((w) => !source.has(w));
    expect(extra).toEqual([]);
  });
});

describe('markdownPagePath', () => {
  it('maps page paths and refuses everything else', () => {
    expect(markdownPagePath(undefined)).toBe('/');
    expect(markdownPagePath(['races', 'kentucky'])).toBe('/races/kentucky');
    expect(markdownPagePath(['r', 'ca~state', 'attorney-general-ca'])).toBe('/r/ca~state/attorney-general-ca');
    for (const bad of [['api', 'ballot'], ['md'], ['mcp'], ['d', 'abc'], ['llms.txt'], ['..', 'x'], ['a%2F..'], ['%E0%A4%A']]) expect(markdownPagePath(bad), bad.join('/')).toBeNull();
  });

  it('names the .md address', () => {
    expect(markdownUrl('/')).toMatch(/\/index\.md$/);
    expect(markdownUrl('/methodology')).toMatch(/\/methodology\.md$/);
  });
});
