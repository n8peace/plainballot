import { ImageResponse } from 'next/og';
import { SAMPLE_BALLOT } from '@/lib/ballot/sample';
import { issueById, type IssueId } from '@/lib/issues';

export const alt = 'Plain Ballot: who’s on your ballot, and where they stand, in the candidates’ own words';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// The preview card people see when the link is texted or posted. Same promise as the
// hero and the meta description, set in the site's own type, showing the product itself:
// a slice of the (fictional) sample ballot table.

async function font(family: string, weight: number, italic = false): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:ital,wght@${italic ? 1 : 0},${weight}`)).text();
    const url = /src: url\((.+?)\) format\('(opentype|truetype)'\)/.exec(css)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

const INK = '#121212';
const INK2 = '#4a4a48';
const RULE = '#d6d6d2';

export default async function OpengraphImage() {
  const [serif, serifBody, serifItalic, sans] = await Promise.all([font('Newsreader', 600), font('Newsreader', 400), font('Newsreader', 400, true), font('Libre Franklin', 500)]);
  const fonts = [
    serif && { name: 'Newsreader', data: serif, weight: 600 as const, style: 'normal' as const },
    serifBody && { name: 'Newsreader', data: serifBody, weight: 400 as const, style: 'normal' as const },
    serifItalic && { name: 'Newsreader', data: serifItalic, weight: 400 as const, style: 'italic' as const },
    sans && { name: 'Franklin', data: sans, weight: 500 as const, style: 'normal' as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 400 | 500 | 600; style: 'normal' | 'italic' }[];

  const race = SAMPLE_BALLOT.contests.find((c) => c.id === 'state-senate-14')!;
  const [a, b] = race.choices;
  const rows: IssueId[] = ['tax', 'housing', 'schools'];
  const cell = (pos: number | undefined, id: IssueId) => {
    if (pos === undefined) return <div style={{ display: 'flex', flex: 1, fontFamily: 'Franklin', fontSize: 22, color: '#77776f' }}>No public position</div>;
    const i = issueById[id];
    const side = pos === 0 ? 'neither side' : pos < 0 ? i.l : i.r;
    return (
      <div style={{ display: 'flex', flex: 1, fontSize: 28, gap: 8 }}>
        {Math.abs(pos) === 2 && <span style={{ fontStyle: 'italic', fontWeight: 400 }}>Strongly</span>}
        <span style={{ fontWeight: 400 }}>{Math.abs(pos) === 2 ? side : side[0].toUpperCase() + side.slice(1)}</span>
      </div>
    );
  };

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#ffffff', color: INK, padding: '48px 72px', fontFamily: 'Newsreader, serif' }}>
        {/* The renderer has no double borders: draw the masthead rule as two lines. */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `2px solid ${INK}`, paddingBottom: 12 }}>
          <div style={{ display: 'flex', fontSize: 56, fontWeight: 600, letterSpacing: -1 }}>Plain Ballot</div>
          <div style={{ display: 'flex', fontFamily: 'Franklin', fontSize: 22, color: INK2 }}>plainballot.com</div>
        </div>
        <div style={{ display: 'flex', height: 1, background: INK, marginTop: 3 }} />
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 60, fontWeight: 600, lineHeight: 1.08, letterSpacing: -1, marginTop: 28 }}>
          <span>Who’s on your ballot,</span>
          <span>and where they stand.</span>
        </div>
        <div style={{ display: 'flex', fontSize: 30, fontStyle: 'italic', fontWeight: 400, color: INK2, marginTop: 10 }}>In the candidates’ own words.</div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
          <div style={{ display: 'flex', fontFamily: 'Franklin', fontSize: 18, letterSpacing: 2, color: INK2, marginBottom: 6 }}>SAMPLE BALLOT · STATE SENATE</div>
          <div style={{ display: 'flex', borderBottom: `1px solid ${RULE}`, paddingBottom: 8 }}>
            <div style={{ display: 'flex', width: 250 }} />
            <div style={{ display: 'flex', flex: 1, fontSize: 30, fontWeight: 600 }}>{a.name}</div>
            <div style={{ display: 'flex', flex: 1, fontSize: 30, fontWeight: 600 }}>{b.name}</div>
          </div>
          {rows.map((id) => (
            <div key={id} style={{ display: 'flex', alignItems: 'baseline', borderBottom: `1px solid ${RULE}`, padding: '10px 0' }}>
              <div style={{ display: 'flex', width: 250, fontFamily: 'Franklin', fontSize: 22, color: INK2 }}>{issueById[id].name}</div>
              {cell(a.stances[id]?.pos, id)}
              {cell(b.stances[id]?.pos, id)}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
