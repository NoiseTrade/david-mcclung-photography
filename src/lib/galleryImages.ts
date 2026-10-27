// src/lib/galleryImages.ts
import path from 'path';
import sharp from 'sharp';

const allImages = import.meta.glob<{ default: ImageMetadata }>(
  '/src/content/collections/**/*.{jpg,jpeg,png,webp}',
  { eager: true }
);

export interface GalleryImage {
  image: ImageMetadata;
  exif: {
    aperture?: number;
    shutterSpeed?: string;
    iso?: number;
    focalLength?: number;
    camera?: string;
    lens?: string;
  };
}

function parseExifBuffer(buf: Buffer): GalleryImage['exif'] {
  const tiffOffset =
    buf.length > 6 && buf.toString('ascii', 0, 6) === 'Exif\0\0' ? 6 : 0;
  const tiff = buf.subarray(tiffOffset);
  if (tiff.length < 8) return {};

  const byteOrder = tiff.toString('ascii', 0, 2);
  if (byteOrder !== 'II' && byteOrder !== 'MM') return {};
  const le = byteOrder === 'II';

  const readU16 = (off: number) => (le ? tiff.readUInt16LE(off) : tiff.readUInt16BE(off));
  const readU32 = (off: number) => (le ? tiff.readUInt32LE(off) : tiff.readUInt32BE(off));

  const readTagValue = (type: number, count: number, valueFieldOffset: number) => {
    const typeSizes: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8 };
    const unitSize = typeSizes[type];
    if (!unitSize) return undefined;

    const totalSize = unitSize * count;
    const dataOffset = totalSize <= 4 ? valueFieldOffset : readU32(valueFieldOffset);
    if (dataOffset + totalSize > tiff.length) return undefined;

    if (type === 2) {
      return tiff
        .toString('utf8', dataOffset, dataOffset + count)
        .replace(/\0+$/, '')
        .trim();
    }
    if (type === 3) return readU16(dataOffset);
    if (type === 4) return readU32(dataOffset);
    if (type === 5) {
      const num = readU32(dataOffset);
      const den = readU32(dataOffset + 4);
      return den ? num / den : undefined;
    }
    return undefined;
  };

  const readIfd = (ifdOffset: number) => {
    const tags = new Map<number, string | number>();
    if (ifdOffset + 2 > tiff.length) return tags;
    const count = readU16(ifdOffset);
    for (let i = 0; i < count; i++) {
      const entryOffset = ifdOffset + 2 + i * 12;
      if (entryOffset + 12 > tiff.length) break;
      const tag = readU16(entryOffset);
      const type = readU16(entryOffset + 2);
      const numValues = readU32(entryOffset + 4);
      const val = readTagValue(type, numValues, entryOffset + 8);
      if (val !== undefined) tags.set(tag, val);
    }
    return tags;
  };

  const ifd0Offset = readU32(4);
  const ifd0 = readIfd(ifd0Offset);
  const exifIfdOffset = ifd0.get(0x8769);
  const exifIfd = typeof exifIfdOffset === 'number' ? readIfd(exifIfdOffset) : new Map();

  const exposureTime = exifIfd.get(0x829a) as number | undefined;
  let shutterSpeed: string | undefined;
  if (exposureTime) {
    shutterSpeed =
      exposureTime >= 1 ? `${exposureTime}s` : `1/${Math.round(1 / exposureTime)}s`;
  }

  return {
    aperture: exifIfd.get(0x829d) as number | undefined,
    shutterSpeed,
    iso: exifIfd.get(0x8827) as number | undefined,
    focalLength: exifIfd.get(0x920a) as number | undefined,
    camera: (ifd0.get(0x0110) as string | undefined) || undefined,
    lens: (exifIfd.get(0xa434) as string | undefined) || undefined,
  };
}

export async function getGalleryImages(slug: string): Promise<GalleryImage[]> {
  const entries = Object.entries(allImages).filter(([filePath]) =>
    filePath.includes(`/collections/${slug}/`)
  );

  const results = await Promise.all(
    entries.map(async ([filePath, mod]) => {
      const absolutePath = path.join(process.cwd(), filePath);
      let exifData: GalleryImage['exif'] = {};

      try {
        const metadata = await sharp(absolutePath).metadata();
        if (metadata.exif) {
          exifData = parseExifBuffer(metadata.exif);
        }
      } catch {
        // No EXIF data found, or file doesn't support it — fail silently
      }

      return { image: mod.default, exif: exifData };
    })
  );

  return results;
}