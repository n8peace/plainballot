import { ImageResponse } from 'next/og';
import { issueById, readout } from '@/lib/issues';
import { decodePrefs } from '@/lib/share';

export const alt = 'What I care about this election';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const DOTS = { low: 1, medium: 2, high: 3 } as const;

// The preview people see when a "compare our priorities" link is texted or posted:
// issues and sides only. Never candidates.
export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const prefs = decodePrefs(decodeURIComponent((await params).code));
  const rows = (prefs?.sel ?? []).slice(0, 6);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', color: '#121212', padding: '52px 72px', fontFamily: 'serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '6px solid #121212', paddingBottom: 14 }}>
          <div style={{ display: 'flex', fontSize: 60 }}>What I care about</div>
          <div style={{ display: 'flex', fontSize: 26, fontFamily: 'sans-serif', color: '#4a4a48' }}>Plain Ballot</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 18 }}>
          {rows.map((id) => {
            const i = issueById[id];
            const n = DOTS[prefs!.imp[id] ?? 'medium'];
            return (
              <div key={id} style={{ display: 'flex', alignItems: 'center', fontSize: 34, padding: '12px 0', borderBottom: '2px solid #d6d6d2' }}>
                <div style={{ display: 'flex', width: 380, fontFamily: 'sans-serif', fontWeight: 700, fontSize: 28 }}>{i.name}</div>
                <div style={{ display: 'flex', flex: 1 }}>{readout(i, prefs!.pos[id] ?? 0)}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1, 2, 3].map((d) => (
                    <div key={d} style={{ width: 22, height: 14, borderRadius: '50%', border: '3px solid #121212', background: d <= n ? '#121212' : 'transparent' }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', marginTop: 'auto', fontSize: 28, fontFamily: 'sans-serif', color: '#4a4a48' }}>
          {prefs && prefs.sel.length > rows.length ? `+${prefs.sel.length - rows.length} more · ` : ''}See where we agree, then get your own ballot
        </div>
      </div>
    ),
    size,
  );
}
