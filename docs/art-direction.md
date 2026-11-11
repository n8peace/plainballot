# Art direction: the paper ballot

Plain Ballot's world is the paper ballot a voter fills in with a pencil. Every visual choice on the site should come from that object. If a new element could not be printed on a ballot, a sample ballot or the instruction sheet that comes with it, it probably does not belong.

## The world

- **Object:** an optical-scan sample ballot on uncoated card. It has a stub above a perforation, black contest bars with the district on the right, timing marks down the left edge, and ovals to fill in.
- **Technique:** graphite pencil on uncoated card. Marks are hand-filled ovals, never a perfect vector dot. The paper, the oval fills and the pencil are AI-made images (ChatGPT's image model through Codex), processed into small WebP files in `public/art/`.
- **Palette:** ballot card `#ede9df`, ballot ink `#1d1b17`, secondary ink `#57534a`. The page around the ballot keeps the site's own white and near-black. The ballot keeps its paper and ink in dark mode, because it is a physical object.
- **Type:** Newsreader (serif) for the page's voice and the quotes. Libre Franklin (sans) as "ballot type": names, contest bars and labels on the paper.
- **Neutral colour:** no red or blue anywhere. One ink colour, so no side is coded.

## The hero

The front page shows the fictional sample ballot (`lib/ballot/sample.ts`), labeled "Sample ballot" and "Fictional candidates." It is tilted slightly and runs off the right edge of the window. Only the paper's empty margin is cut, never its words.

- Each row is one candidate on one issue. The five ovals are the issue's scale, ends named the way each side would say it. The filled oval is where that candidate's quote puts them, and the quote and its source sit beside it. No oval ever sits next to a name as a vote.
- The last row of the first race is the visitor's ("You"). Fit numbers appear only after the visitor marks an oval, and they come from `lib/match.ts` unchanged. A tied top fit says ", tied". No winner is marked.
- Motion: when the ballot comes into view, a pencil travels to each row and fills the oval in six steps, and the quote fades in. Then it rests by the "You" row. Touching or focusing the ballot ends the play at the filled state. Reduce Motion shows the filled state from the first paint.
- Timing marks are printed beside each contest bar and each row, as on a real scanned ballot, not as a decorative strip.

## Echoes on the rest of the page

- "How Plain Ballot works" sits under the address form like a ballot's instruction box: a black contest-style bar, then lines marked with hand-filled ovals.
- FAQ toggles are ovals: empty when closed, filled when open.
- No other ornament. Rules are plain hairlines.

## Voice

Plain and exact, the way an elections office writes. Say what a candidate said or did. Headline 7 words or fewer, one support sentence of 12 or fewer.

## Never

- Real candidates, parties, people, flags or campaign imagery.
- Red-versus-blue coding, stars, stripes or bunting.
- A filled oval beside a candidate's name that reads as a vote.
- A fit number before the visitor has set a side, or a winner on a tie.
- A quote without its source on screen.
- Gradients, glows, blobs, stock icons or emoji.
