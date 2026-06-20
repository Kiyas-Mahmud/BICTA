import sanitizeHtml from 'sanitize-html'

// Sanitize-on-write for all rich text fields (event description, competition
// description/rules, news content). See Security_Plan.md §5.
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'blockquote', 'img', 'br'],
    allowedAttributes: {
      a: ['href'],
      img: ['src', 'alt'],
    },
    allowedSchemes: ['http', 'https'],
    allowProtocolRelative: false,
    // Allow site-relative upload paths on img src / a href.
    allowedSchemesAppliedToAttributes: ['href', 'src'],
  })
}
