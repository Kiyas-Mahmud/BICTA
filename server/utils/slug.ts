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
export function uniqueSlug(base: string, taken: (slug: string) => boolean): string {
  let slug = base
  let n = 2
  while (taken(slug)) {
    slug = `${base}-${n}`
    n++
  }
  return slug
}
