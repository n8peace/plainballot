import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { loadSharedRace } from '@/lib/ballot/race-share';

export const alt = 'A race and its choices on Plain Ballot';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ division: string; contest: string }> }) {
  const { division, contest } = await params;
  const race = await loadSharedRace(division, contest);
  if (!race) notFound();
  const district = race.contest.sub.split(' · ')[0];
  const all = race.contest.choices.map((choice) => choice.name);
  // Same order as the page; long races show the first six and a count.
  const names = all.length > 6 ? [...all.slice(0, 5), `and ${all.length - 5} more`] : all;
  const nameSize = names.length > 5 ? 29 : names.length > 3 ? 34 : 40;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', color: '#121212', padding: '52px 72px', fontFamily: 'serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '6px solid #121212', paddingBottom: 14 }}>
          <div style={{ display: 'flex', fontSize: 26, fontFamily: 'sans-serif', color: '#4a4a48' }}>{district}</div>
          <div style={{ display: 'flex', fontSize: 26, fontFamily: 'sans-serif', color: '#4a4a48' }}>Plain Ballot</div>
        </div>
        <div style={{ display: 'flex', fontSize: 66, lineHeight: 1.05, marginTop: 32 }}>{race.contest.office}</div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 30, borderTop: '2px solid #d6d6d2' }}>
          {names.map((name) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', fontSize: nameSize, padding: '12px 0', borderBottom: '2px solid #d6d6d2' }}>
              {name}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', marginTop: 'auto', fontSize: 25, fontFamily: 'sans-serif', color: '#4a4a48' }}>
          Exact quotes and source links for every published position
        </div>
      </div>
    ),
    size,
  );
}
