// California Community College District boundaries
// Source: https://services6.arcgis.com/XNnWmtFBLgSx99Bz/arcgis/rest/services/CCC_ArcGIS__Map_Bundle/FeatureServer/4
// Downloaded: 2026-11-12

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type Position = [number, number];
interface Feature {
  properties?: { DistrictNa?: unknown };
  geometry?: {
    type?: unknown;
    coordinates?: unknown;
  };
}

const input = process.argv[2];
if (!input) {
  console.error('Usage: node --import tsx scripts/build-ccd.ts <districts.geojson>');
  process.exit(1);
}

const round = (value: number) => Math.round(value * 100_000) / 100_000;
const position = (value: unknown): Position => {
  if (!Array.isArray(value) || value.length < 2 || !Number.isFinite(value[0]) || !Number.isFinite(value[1])) {
    throw new Error('Invalid coordinate in GeoJSON');
  }
  return [round(value[0] as number), round(value[1] as number)];
};

async function main() {
  const geojson = JSON.parse(await readFile(resolve(input), 'utf8')) as { type?: unknown; features?: Feature[] };
  if (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
    throw new Error('Expected a GeoJSON FeatureCollection');
  }

  const districts = geojson.features.map((feature) => {
    const name = feature.properties?.DistrictNa;
    const type = feature.geometry?.type;
    const coordinates = feature.geometry?.coordinates;
    if (typeof name !== 'string' || !name || !Array.isArray(coordinates)) {
      throw new Error('Feature is missing DistrictNa or geometry');
    }
    if (type !== 'Polygon' && type !== 'MultiPolygon') {
      throw new Error(`Unsupported geometry for ${name}: ${String(type)}`);
    }

    const polygons = (type === 'Polygon' ? [coordinates] : coordinates) as unknown[][];
    const rings = polygons.flatMap((polygon) => {
      if (!Array.isArray(polygon)) throw new Error(`Invalid polygon for ${name}`);
      return polygon.map((ring) => {
        if (!Array.isArray(ring) || ring.length < 4) throw new Error(`Invalid ring for ${name}`);
        return ring.map(position);
      });
    });
    return { name, rings };
  });

  const output = fileURLToPath(new URL('../lib/address/ccd-boundaries.json', import.meta.url));
  await writeFile(output, `${JSON.stringify(districts)}\n`);
  console.log(`Wrote ${districts.length} districts to ${output}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
