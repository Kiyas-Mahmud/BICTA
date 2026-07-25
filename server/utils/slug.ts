export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item'
}

// Appends -2, -3, … until `taken` no longer reports a collision.
// `taken` is awaited: collision checks hit D1, which is async-only.
export async function uniqueSlug(base: string, taken: (slug: string) => boolean | Promise<boolean>): Promise<string> {
  let slug = base
  let n = 2
  while (await taken(slug)) {
    slug = `${base}-${n}`
    n++
  }
  return slug
}
