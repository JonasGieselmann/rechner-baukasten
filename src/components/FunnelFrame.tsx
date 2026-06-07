import { useEffect, useRef, useState } from 'react';
import { BRAND } from '../../branding/tokens';

// Embeds a funnel and auto-sizes the iframe to its content height (the funnel
// posts 'bf-funnel-height'). With no inner scroll, the surrounding dashboard
// page scrolls naturally — fixes the mobile "can't scroll to the end" trap that
// a fixed-height (80vh) iframe caused.
export default function FunnelFrame({ slug, title }: { slug: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (ref.current && e.source !== ref.current.contentWindow) return;
      const data = e.data as { type?: string; height?: number };
      if (data?.type === 'bf-funnel-height' && typeof data.height === 'number') {
        // Clamp to a sane range to avoid a runaway/zero height.
        setHeight(Math.max(320, Math.min(data.height, 20000)));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <iframe
      ref={ref}
      src={`/funnel/${slug}`}
      title={title}
      scrolling="no"
      className="w-full border-0 block"
      style={{ height: height ? `${height}px` : '80vh', minHeight: '60vh', borderRadius: BRAND.radii.card }}
    />
  );
}
