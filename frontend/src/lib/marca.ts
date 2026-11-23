export interface BrandCache {
  name: string;
  logo: string;
}

const BRAND_CACHE_KEY = 'sigtm-brand';

export function readBrandCache(): BrandCache {
  try {
    const raw = localStorage.getItem(BRAND_CACHE_KEY);
    if (!raw) return { name: '', logo: '' };
    const parsed = JSON.parse(raw) as Partial<BrandCache>;
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      logo: typeof parsed.logo === 'string' ? parsed.logo : '',
    };
  } catch {
    return { name: '', logo: '' };
  }
}

export function writeBrandCache(name?: string | null, logo?: string | null) {
  try {
    localStorage.setItem(
      BRAND_CACHE_KEY,
      JSON.stringify({
        name: (name ?? '').trim(),
        logo: logo ?? '',
      } satisfies BrandCache),
    );
  } catch {
    /* localStorage puede estar bloqueado. */
  }
}
