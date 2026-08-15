export declare function formatBytes(bytes: number): string;

export declare function detectPlatform(): 'mac' | 'win' | 'unknown';

export declare function releasesUrl(repo: string): string;

export interface ReleaseAsset {
  url: string;
  name: string;
  size: number;
}

export interface LatestAssets<K extends string = string> {
  assets: Record<K, ReleaseAsset | null>;
  version: string | null;
  publishedAt: string | null;
  error: boolean;
}

export declare function fetchLatestAssets<K extends string>(
  repo: string,
  matchers: Record<K, string>,
): Promise<LatestAssets<K>>;
