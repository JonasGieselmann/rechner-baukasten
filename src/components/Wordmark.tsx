import { BRAND } from '../../branding/tokens';

interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const SIZE_CLASSES: Record<NonNullable<WordmarkProps['size']>, string> = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-2xl',
};

export function Wordmark({ size = 'md', color }: WordmarkProps) {
  const cls = SIZE_CLASSES[size];
  return (
    <span
      className={`${cls} font-semibold tracking-tight inline-flex items-baseline`}
      style={{ color: color ?? BRAND.colors.text }}
    >
      Beauty<span className="brand-accent ml-[1px]">Flow</span>
    </span>
  );
}
