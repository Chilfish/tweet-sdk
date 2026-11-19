/**
 * Media URL normalization (app/lib/media-url.ts)
 *
 * Normalizes twimg media image links from the query form `?name=<size>&format=<ext>`
 * (or `?format=<ext>&name=<size>`) into the path form `<slug>.<ext>`:
 *
 *   https://pbs.twimg.com/media/HPxZhM0aQAAZxz3?format=jpg&name=small
 *     → https://pbs.twimg.com/media/HPxZhM0aQAAZxz3.jpg
 *
 * Exception: `/card_img/<id>/<slug>` (link card image) does not support the path
 * form — `/card_img/2096230549069438976/ZRBr6uOS.jpg` returns 404, and only the
 * query form `?format=<ext>&name=<size>` is reachable. This path therefore keeps
 * the query and fills in the defaults `format=jpg&name=large` when missing.
 *
 * URLs that already carry an extension (such as the official original image
 * `.../HPxZhM0aQAAZxz3.jpg`) are kept as-is; only the `format` and `name` query
 * parameters are stripped. Every media link consumer (getMediaUrl / buildMediaUrl /
 * card rendering / Markdown export) shares this function, avoiding a sixth set of
 * media URL logic (Postmortem #005).
 */

const IMAGE_EXT_RE = /\.(?:jpe?g|png|webp|gif|avif|heic|heif)$/i
const CARD_IMG_PATH_RE = /^\/card_img\//

export function normalizeMediaUrl(raw: string): string {
  if (!raw)
    return raw
  try {
    const url = new URL(raw)
    // card_img only works in query form: folding format into the path yields 404, so keep the query and fill in defaults
    if (CARD_IMG_PATH_RE.test(url.pathname)) {
      if (!url.searchParams.has('format'))
        url.searchParams.set('format', 'jpg')
      if (!url.searchParams.has('name'))
        url.searchParams.set('name', 'large')
      return url.toString()
    }
    // Path already ends with an image extension → keep it; otherwise fold the format query param into the path
    if (!IMAGE_EXT_RE.test(url.pathname)) {
      const format = url.searchParams.get('format')
      if (format)
        url.pathname = `${url.pathname}.${format}`
    }
    url.searchParams.delete('format')
    url.searchParams.delete('name')
    return url.toString()
  }
  catch {
    return raw
  }
}

/**
 * Strips X's size suffix (`_normal` / `_bigger` / `_mini` / `_400x400`) from an
 * avatar URL to get the original image:
 * `.../hXskVj9F_normal.png` → `.../hXskVj9F.png`.
 *
 * Avatars not hosted on pbs.twimg.com (IG CDN, etc.) have no such suffix and are
 * returned as-is.
 */
const PROFILE_SIZE_SUFFIX_RE = /_(?:mini|normal|bigger|400x400|200x200)(?=\.(?:jpe?g|png|webp|gif)(?:[?#]|$))/i
const TWIMG_HOST_RE = /(?:^|\.)twimg\.com$/i

export function normalizeProfileImageUrl(raw: string): string {
  if (!raw)
    return raw
  try {
    if (!TWIMG_HOST_RE.test(new URL(raw).hostname))
      return raw
  }
  catch {
    return raw
  }
  return raw.replace(PROFILE_SIZE_SUFFIX_RE, '')
}
