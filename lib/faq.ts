// The home page FAQ, wording approved by Nate on Nov 2, 2026. Change it only with his yes:
// tests/faq.test.ts pins every word. The page and the FAQPage tag both read this one copy.
export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Does Plain Ballot tell me how to vote?',
    a: 'No. You pick the issues that matter to you and where you stand. For each race, we show whose quoted positions are closest to yours and why. We never recommend, endorse or rate anyone.',
  },
  {
    q: 'What does a blank mean?',
    a: 'A blank means we couldn’t find a quote on that issue, or our research agents didn’t agree on it. It isn’t a vote for or against anything. Blanks are left out of the match, and we never fill them in from party or endorsements.',
  },
  {
    q: 'Where do the positions come from?',
    a: 'Each one has an exact quote and a link to its source, like a candidate’s website, a debate or an interview. Every quote is checked word for word against its source, and checked again every night.',
  },
  {
    q: 'Do you store my address?',
    a: 'No. Your address is used only to find your ballot. Your issue choices aren’t stored either.',
  },
  {
    q: 'What races are covered?',
    a: 'Every race in California, plus U.S. House and Senate races in all 50 states.',
  },
  {
    q: 'What if something is wrong?',
    a: 'Tap “Report a mistake” on any claim. The report is public, and it starts a fresh check. If the answer changes, we publish the correction.',
  },
];

export function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}
