import { BRAND } from '../../branding/tokens';

type Size = 'sm' | 'md' | 'lg';

interface AvatarProps {
  name?: string | null;
  email?: string | null;
  size?: Size;
  title?: string;
}

const SIZE_CLASS: Record<Size, string> = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-xl',
};

export function Avatar({ name, email, size = 'md', title }: AvatarProps) {
  const source = (name?.trim() || email || '?').charAt(0).toUpperCase();
  return (
    <div
      className={`${SIZE_CLASS[size]} rounded-full flex items-center justify-center font-semibold select-none shrink-0`}
      style={{ backgroundColor: BRAND.colors.accent, color: BRAND.colors.background }}
      title={title ?? email ?? undefined}
      aria-label={name ?? email ?? 'Avatar'}
    >
      {source}
    </div>
  );
}
