// src/lib/galleryImages.ts
import exifr from 'exifr';
import path from 'path';


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

export async function getGalleryImages(slug: string): Promise<GalleryImage[]> {
  const entries = Object.entries(allImages).filter(([filePath]) =>
    filePath.includes(`/collections/${slug}/`)
  );

  const results = await Promise.all(
    entries.map(async ([filePath, mod]) => {
      const absolutePath = path.join(process.cwd(), filePath);
      let exifData: GalleryImage['exif'] = {};

      try {
        const parsed = await exifr.parse(absolutePath, {
          pick: ['FNumber', 'ExposureTime', 'ISO', 'Model', 'LensModel'],
        });


        if (parsed) {
          exifData = {
            aperture: parsed.FNumber,
            shutterSpeed: parsed.ExposureTime
              ? `1/${Math.round(1 / parsed.ExposureTime)}s`
              : undefined,
            iso: parsed.ISO,
            focalLength: parsed.FocalLength,
            camera: parsed.Model,
            lens: parsed.LensModel,
          };
        }
      } catch {
        // No EXIF data found, or file doesn't support it — fail silently
      }

      return { image: mod.default, exif: exifData };
    })
  );

  return results;
}