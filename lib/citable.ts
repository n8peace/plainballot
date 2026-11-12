import { SITE_URL } from './share';

// The "How it works" pages search engines and AI assistants can cite. Each one gets a
// canonical link, Article tags, a sitemap line and an llms.txt line (tests/citable.test.ts).
export interface CitablePage { path: string; title: string; description: string; updated: string }

export const CITABLE_PAGES: CitablePage[] = [
  {
    path: '/methodology',
    title: 'How Plain Ballot works',
    description: 'Where the data comes from, how every quote is checked, and how matching works.',
    updated: '2026-11-10',
  },
  {
    path: '/what-we-never-do',
    title: 'What Plain Ballot will never do',
    description: 'Plain Ballot never endorses, never tells anyone how to vote, never guesses from party, and makes no claim without a checked quote.',
    updated: '2026-11-10',
  },
  {
    path: '/releases',
    title: 'Plain Ballot release log',
    description: 'Every change to Plain Ballot that voters can see, with the date it shipped and why.',
    updated: '2026-11-10',
  },
];

export function citablePage(path: string): CitablePage {
  const page = CITABLE_PAGES.find((p) => p.path === path);
  if (!page) throw new Error(`Not a citable page: ${path}`);
  return page;
}

export function articleJsonLd(page: CitablePage) {
  const org = { '@type': 'Organization', name: 'Plain Ballot', url: SITE_URL };
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.title,
    description: page.description,
    url: `${SITE_URL}${page.path}`,
    mainEntityOfPage: `${SITE_URL}${page.path}`,
    dateModified: page.updated,
    author: org,
    publisher: org,
  };
}

export interface Release { date: string; what: string; why: string }

// Newest first. Only changes a voter or an AI assistant can see; research batches and
// internal tooling are left out.
export const RELEASES: Release[] = [
  { date: '2026-11-12', what: 'Every race now carries the “whose words” labels: 9,740 quotes say whether they are the candidate’s own words, an official record, or a description. A quote whose source couldn’t be reached to decide stays unlabeled.', why: 'So the same check covers every race, not just California’s.' },
  { date: '2026-11-12', what: 'Community college district measures now reach the right ballots in California. An address is placed in its college district using the state’s district boundaries, checked on our own server.', why: 'College bond measures were missing from voters’ ballots because the federal address service has no college district boundaries.' },
  { date: '2026-11-12', what: 'When a quote has left its page, the source can be an Internet Archive copy that still shows it word for word, named by the original site and marked “archived copy”.', why: 'So every quote stays checkable after a campaign site changes or goes offline.' },
  { date: '2026-11-11', what: 'Each quote can now say whose words it is: “Their own words”, “Official record”, or “A description, not their words”. Labels start on California’s statewide races and are being added across every race, decided by the same multi-model agreement rule as positions.', why: 'So a voter can tell a candidate’s own words from a summary of them.' },
  { date: '2026-11-11', what: 'Share one race or measure: each race on a ballot has a “Share this race” link to a page with every choice, quote and source for that race. The link never includes an address or anyone’s choices.', why: 'So a voter can show someone a single race without sharing where they live or how they plan to vote.' },
  { date: '2026-11-10', what: 'A one-line setup for AI assistants: paste it into your own assistant and it connects Plain Ballot for you, with a one-click link for Cursor.', why: 'So a voter can look up their ballot from the assistant they already use.' },
  { date: '2026-11-10', what: 'Assistants are told never to pair Plain Ballot’s data with a partisan take, and to say which answers came from their own search. Every ballot answer carries that note.', why: 'So answers from an AI assistant stay as neutral as the site.' },
  { date: '2026-11-04', what: 'Ballots looked up by AI assistants are counted, by state and by which AI app sent them.', why: 'To know how many voters reach their ballot through an assistant. No address or district is kept.' },
  { date: '2026-11-03', what: 'Privacy and Terms pages.', why: 'To say plainly what happens to an address, a voter’s own words and their choices.' },
  { date: '2026-11-03', what: 'The three AI assistant tools are marked read-only.', why: 'So assistants and app stores know the tools only look things up and change nothing.' },
  { date: '2026-11-03', what: 'Visits are counted per shared post when a link carries a tag like ?ref=li-1102.', why: 'To learn which posts bring people to their ballot, without cookies.' },
  { date: '2026-10-27', what: 'Ballot lookups are counted once per browser per election, by state only.', why: 'To measure how many people pull up a ballot, without storing anything personal.' },
  { date: '2026-10-27', what: 'No winner is shown on a tie, no fit is shown until a side is set, and quote labels say who said it.', why: 'So the ballot never suggests more than the data supports.' },
  { date: '2026-10-27', what: 'Assistants are told to research races Plain Ballot doesn’t cover to the same quote standard.', why: 'So answers outside our coverage are held to the same rules.' },
  { date: '2026-10-26', what: 'A light and dark switch.', why: 'Easier reading on any screen.' },
  { date: '2026-10-25', what: 'An AI assistant tool at plainballot.com/mcp.', why: 'So a voter’s own assistant can look up their ballot from the same open data.' },
  { date: '2026-10-24', what: 'A newspaper-style home page that works on phones.', why: 'Most voters look up their ballot on a phone.' },
  { date: '2026-10-24', what: 'Researched races are shown first; Google’s ballot data is used only to fill gaps.', why: 'So every race we show with positions has a checked quote behind it.' },
  { date: '2026-10-23', what: 'When the Census district lookup is down, the page says so and asks you to retry.', why: 'A missing ballot should never look like an empty one.' },
  { date: '2026-10-05', what: 'U.S. House and Senate races in all 50 states.', why: 'Every voter in the country has federal races on their ballot.' },
  { date: '2026-09-29', what: 'About 300 fewer words on the page.', why: 'Shorter is easier to read and to check.' },
  { date: '2026-09-25', what: 'The research moved to Open Election Data, a free open dataset the site reads.', why: 'So anyone can check, reuse or correct the positions behind the ballot.' },
  { date: '2026-09-25', what: 'Ballot measures are read from their official text, with three AI models voting on each.', why: 'So a measure’s sides come from what it says, not from who backs it.' },
  { date: '2026-09-24', what: 'Every change to the site gets an automated bias review by models from three companies.', why: 'To catch slanted wording before it ships.' },
  { date: '2026-09-24', what: 'Every race in California, plus federal races outside California.', why: 'The first coverage for the Nov 3, 2026 election.' },
];
