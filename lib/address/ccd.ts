import boundaries from './ccd-boundaries.json';

type Position = [number, number];
interface Boundary {
  name: string;
  rings: Position[][];
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const ccdKey = (name: string) => `ccd-${slug(name)}`;

const districts = (boundaries as Boundary[]).map((district) => {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const ring of district.rings) {
    for (const [lon, lat] of ring) {
      minLon = Math.min(minLon, lon);
      minLat = Math.min(minLat, lat);
      maxLon = Math.max(maxLon, lon);
      maxLat = Math.max(maxLat, lat);
    }
  }
  return { ...district, bounds: [minLon, minLat, maxLon, maxLat] as const };
});

const ringContains = (ring: Position[], lon: number, lat: number) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

export function ccdAt(lon: number, lat: number): { key: string; label: string } | null {
  for (const district of districts) {
    const [minLon, minLat, maxLon, maxLat] = district.bounds;
    if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) continue;

    let inside = false;
    for (const ring of district.rings) {
      if (ringContains(ring, lon, lat)) inside = !inside;
    }
    if (inside) {
      return {
        key: ccdKey(district.name),
        label: district.name === 'Sonoma County'
          ? 'Sonoma County Junior College District'
          : `${district.name} Community College District`,
      };
    }
  }
  return null;
}
