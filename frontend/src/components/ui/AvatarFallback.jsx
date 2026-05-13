import { useState } from 'react';
import avatarMale from '../../assets/avatar-default-male.svg';
import avatarFemale from '../../assets/avatar-default-female.svg';

/**
 * AvatarFallback — robust avatar renderer.
 *
 * Renders an <img> using:
 *   1. user.avatarUrl when set
 *   2. otherwise a gender-appropriate default SVG (male / female)
 *
 * If the image fails to load (broken URL, missing asset), it falls back to a
 * deterministic initials disc derived from firstName + lastName. The initials
 * fallback is also used when no gender-default SVG can resolve.
 *
 * Props
 * - user: { firstName, lastName, avatarUrl, gender, companyName? }
 * - size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' (default 'md')
 * - className: optional extra classes applied to the wrapper
 * - title: optional tooltip
 */
const SIZE_PX = {
  xs: 20,
  sm: 28,
  md: 40,
  lg: 64,
  xl: 96,
};

const FONT_SIZE_PX = {
  xs: 9,
  sm: 11,
  md: 15,
  lg: 22,
  xl: 32,
};

const getInitials = (user) => {
  if (!user) return '?';
  if (user.companyName) {
    const parts = user.companyName.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?';
  }
  const f = user.firstName?.[0]?.toUpperCase() || '';
  const l = user.lastName?.[0]?.toUpperCase() || '';
  const initials = `${f}${l}`;
  return initials || '?';
};

export default function AvatarFallback({
  user,
  size = 'md',
  className = '',
  title,
  style: styleOverride,
}) {
  const [errored, setErrored] = useState(false);
  const px = SIZE_PX[size] ?? SIZE_PX.md;
  const fontPx = FONT_SIZE_PX[size] ?? FONT_SIZE_PX.md;
  const initials = getInitials(user);

  const baseStyle = {
    width: px,
    height: px,
    borderRadius: '50%',
    flexShrink: 0,
    objectFit: 'cover',
    ...styleOverride,
  };

  const defaultAvatar = user?.gender === 'FEMME' ? avatarFemale : avatarMale;
  const src = user?.avatarUrl || defaultAvatar;

  if (errored || !src) {
    return (
      <div
        className={`inline-flex items-center justify-center bg-gray-200 text-gray-600 font-semibold select-none ${className}`}
        style={{ ...baseStyle, fontSize: fontPx, lineHeight: 1 }}
        title={title}
        aria-label={title || `Avatar ${initials}`}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={title || `Avatar ${initials}`}
      title={title}
      className={className}
      style={baseStyle}
      onError={() => setErrored(true)}
    />
  );
}
