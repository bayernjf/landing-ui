// 从 GitHub Releases 解析最新版本的下载资产，供落地页的下载按钮直链具体文件。
// 用 .js 而非 .ts：本包以源码形式被 github: 依赖安装，纯 JS 无需消费方转译。

/** @type {(bytes: number) => string} */
export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

/** @type {() => 'mac' | 'win' | 'unknown'} */
export function detectPlatform() {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('mac os x') || ua.includes('macintosh')) return 'mac';
  if (ua.includes('windows')) return 'win';
  return 'unknown';
}

/** @type {(repo: string) => string} */
export function releasesUrl(repo) {
  return `https://github.com/${repo}/releases`;
}

/**
 * 拉取 repo 的最新正式发布，按后缀把资产分配到各平台键上。
 * 只认正式发布：草稿和预发布不会出现在 /releases/latest，因此调用方在产品正式发版前
 * 会持续拿到 error，按钮应保持初始的 releasesUrl() 兜底。
 *
 * @param {string} repo 形如 'bayernjf/soft-desk'
 * @param {Record<string, string>} matchers 平台键 → 资产文件名后缀，如 { mac: '.dmg', win: '.exe' }
 */
export async function fetchLatestAssets(repo, matchers) {
  /** @type {Record<string, { url: string, name: string, size: number } | null>} */
  const assets = {};
  for (const key of Object.keys(matchers)) assets[key] = null;

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const release = await res.json();

    const published = release?.assets || [];
    for (const [key, suffix] of Object.entries(matchers)) {
      const hit = published.find((a) => typeof a?.name === 'string' && a.name.endsWith(suffix));
      if (hit?.browser_download_url) {
        assets[key] = { url: hit.browser_download_url, name: hit.name, size: hit.size ?? 0 };
      }
    }

    return {
      assets,
      version: release?.tag_name ?? null,
      publishedAt: release?.published_at ?? null,
      error: false,
    };
  } catch {
    return { assets, version: null, publishedAt: null, error: true };
  }
}
