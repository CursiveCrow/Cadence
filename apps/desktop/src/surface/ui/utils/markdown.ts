export function markdownToSafeHtml(input: string): string {
  const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#039;')
  const safe = escapeHtml(input || '')
  const withLinks = safe
    .replace(/\[([^\]]+)\]\((https?:[^\s)]+)\)/g, (_m, text, url) => { try { const u = new URL(url); const href = u.toString(); return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>` } catch { return text } })
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\W)\*([^*]+)\*(?=\W|$)/g, '$1<em>$2</em>')
    .replace(/(^|\W)_([^_]+)_(?=\W|$)/g, '$1<em>$2</em>')
  const lines = withLinks.split(/\r?\n/)
  const rendered = lines.map((line) => { const m = line.match(/^\s*[-*]\s+(.*)$/); if (m) return `• ${m[1]}`; return line }).join('\n')
  const paragraphs = rendered.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('')
  return paragraphs
}

