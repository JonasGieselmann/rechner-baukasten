import type { ReactNode } from 'react';

// Renders text with *asterisks* converted to <em> for italic accent words.
// Brand pattern documented in branding/README.md.
export function renderTitleWithItalics(title?: string): ReactNode {
  if (!title) return null;
  const parts = title.split(/(\*[^*]+\*)/g).filter(Boolean);
  return parts.map((p, i) =>
    p.startsWith('*') && p.endsWith('*') ? (
      <em key={i} className="italic font-medium">{p.slice(1, -1)}</em>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}
