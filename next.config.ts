import { withBotId } from 'botid/next/config';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  // Researched positions are read from disk by the ballot API at runtime.
  outputFileTracingIncludes: { '/api/ballot': ['./data/positions/**/*'] },
  // Markdown versions for AI agents (lib/markdown.ts): the same page, asked for with
  // Accept: text/markdown, or at <page>.md. Files, APIs and the MCP server are left alone.
  async rewrites() {
    const markdown = { type: 'header' as const, key: 'accept', value: '(.*,)?\\s*text/markdown\\s*(;[^,]*)?(,.*)?' };
    return {
      beforeFiles: [
        { source: '/', has: [markdown], destination: '/md' },
        { source: '/:path((?!api/|api$|md/|md$|mcp|_next/|d/)[^.]+)', has: [markdown], destination: '/md/:path' },
        { source: '/index.md', destination: '/md' },
        { source: '/:path((?!api/|md/|mcp|_next/|d/|setup\\.md|agents\\.md)[^.]+)\\.md', destination: '/md/:path' },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
      { source: '/', headers: [{ key: 'Link', value: '</index.md>; rel="alternate"; type="text/markdown"' }] },
      { source: '/:path((?!api/|md/|mcp|_next/|d/)[^.]+)', headers: [{ key: 'Link', value: '</:path.md>; rel="alternate"; type="text/markdown"' }] },
    ];
  },
};

export default withBotId(nextConfig);
