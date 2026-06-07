import type { CSSProperties } from 'react';

// Shared modal overlay backdrop (navy @ 50%). Used by every modal dialog so the
// scrim is consistent across the admin surface.
export const OVERLAY_STYLE: CSSProperties = {
  backgroundColor: 'rgba(15, 47, 91, 0.5)',
};
