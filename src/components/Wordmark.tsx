import { BRAND } from '../../branding/tokens';

interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  // 'beautyflow' = the customer/org surface brand; 'kalku' = the platform brand
  // (the Kalku SaaS that sits ABOVE the white-label orgs).
  brand?: 'beautyflow' | 'kalku';
}

const SIZE_CLASSES: Record<NonNullable<WordmarkProps['size']>, string> = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-2xl',
};

export function Wordmark({ size = 'md', color, brand = 'beautyflow' }: WordmarkProps) {
  const cls = SIZE_CLASSES[size];
  return (
    <span
      className={`${cls} font-semibold tracking-tight inline-flex items-baseline`}
      style={{ color: color ?? BRAND.colors.text }}
    >
      {brand === 'kalku' ? (
        <>Kal<span className="brand-accent ml-[1px]">ku</span></>
      ) : (
        <>Beauty<span className="brand-accent ml-[1px]">Flow</span></>
      )}
    </span>
  );
}
