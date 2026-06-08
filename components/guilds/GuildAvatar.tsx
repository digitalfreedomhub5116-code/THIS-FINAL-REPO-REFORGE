import React from 'react';
import { initials } from './guildTheme';

interface GuildAvatarProps {
  name?: string;
  avatarUrl?: string | null;
  size?: number;
  ring?: string;
}

/** Player avatar: uses uploaded photo if present, else initials. */
const GuildAvatar: React.FC<GuildAvatarProps> = ({ name, avatarUrl, size = 36, ring }) => {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    border: ring ? `2px solid ${ring}` : '1px solid rgba(255,255,255,0.12)',
    fontSize: size * 0.38,
  };
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'Hunter'}
        style={style}
        className="object-cover flex-shrink-0"
        loading="lazy"
      />
    );
  }
  return (
    <div
      style={style}
      className="flex items-center justify-center flex-shrink-0 font-bold text-white bg-gradient-to-br from-slate-700 to-slate-900"
    >
      {initials(name)}
    </div>
  );
};

export default GuildAvatar;
