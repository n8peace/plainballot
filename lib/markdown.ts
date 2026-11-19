// Markdown versions of the site's pages, for AI agents. Each one is made from the page's own HTML,
// so it carries the same words people see: nothing added for machines, and the same links and
// sources. Only scripts, styles, images, text fields, icon-only buttons and hidden parts are
// left out. Nothing is added: an image's label, which people don't see, stays out too. Served when a request
// says Accept: text/markdown (or at <page>.md); every reader gets the same content.
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { parse } from 'node-html-parser';
import { SITE_URL } from './share';

/** Paths that never get a Markdown version: APIs, files, and personal shared-ballot links. */
const NOT_PAGES = /^\/(api|md|mcp|_next|d)(\/|$)|\.[a-z0-9]+$/i;

/** The page path a Markdown request is for, or null if it isn't a page. */
export function markdownPagePath(segments: string[] | undefined): string | null {
  let parts: string[];
  try {
    parts = (segments ?? []).map((s) => decodeURIComponent(s));
  } catch {
    return null;
  }
  if (parts.some((p) => p === '' || p === '.' || p === '..' || /[\\/?#]/.test(p))) return null;
  const path = `/${parts.join('/')}`;
  return NOT_PAGES.test(path) ? null : path;
}

const nhm = new NodeHtmlMarkdown({ bulletMarker: '-', useInlineLinks: true, maxConsecutiveNewlines: 2 });

/** The page's visible words as Markdown, with every link made absolute. */
export function htmlToMarkdown(html: string, pageUrl: string): string {
  const root = parse(html, { comment: false });
  const body = root.querySelector('body') ?? root;
  // Not words a reader sees: code, styling, pictures, controls, and anything hidden.
  body.querySelectorAll('script, style, noscript, template, svg, img, picture, video, audio, iframe, input, select, textarea, [hidden]').forEach((el) => el.remove());
  // A button's label is words on the page; an icon-only button (no letters or digits) is not.
  body.querySelectorAll('button').forEach((el) => (/[\p{L}\p{N}]/u.test(el.text) ? el.replaceWith(`<span>${el.innerHTML}</span>`) : el.remove()));
  // The page lays some side-by-side pieces out with CSS alone ("Rob Bonta" | "No public position
  // found"); keep a space between them so the words don't run together.
  body.querySelectorAll('span, a, cite').forEach((el) => {
    if (el.nextSibling?.nodeType === 1) el.insertAdjacentHTML('afterend', ' ');
  });
  body.querySelectorAll('a[href]').forEach((a) => {
    try {
      a.setAttribute('href', new URL(a.getAttribute('href')!, pageUrl).toString());
    } catch {
      a.removeAttribute('href');
    }
  });
  return `${nhm.translate(body.innerHTML).trim()}\n`;
}

export function markdownUrl(path: string): string {
  return `${SITE_URL}${path === '/' ? '/index' : path}.md`;
}
