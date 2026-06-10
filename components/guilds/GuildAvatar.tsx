import React from 'react';
import { initials } from './guildTheme';

interface GuildAvatarProps {
  name?: string;
  avatarUrl?: string | null;
  size?: number;
  ring?: string;
  isOnline?: boolean;
}

/** Player avatar: uses uploaded photo if present, else initials. Includes online indicator dot. */
const GuildAvatar: React.FC<GuildAvatarProps> = ({ name, avatarUrl, size = 36, ring, isOnline = false }) => {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    border: ring ? `2px solid ${ring}` : '1px solid rgba(255,255,255,0.12)',
    fontSize: size * 0.38,
  };

  const avatarElement = avatarUrl ? (
    <img
      src={avatarUrl}
      alt={name || 'Hunter'}
      style={style}
      className="object-cover flex-shrink-0"
      loading="lazy"
    />
  ) : (
    <div
      style={style}
      className="flex items-center justify-center flex-shrink-0 font-bold text-white bg-gradient-to-br from-slate-700 to-slate-900"
    >
      {initials(name)}
    </div>
  );

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {avatarElement}
      {isOnline && (
        <span 
          className="absolute bottom-0 right-0 block rounded-full bg-emerald-500 ring-2 ring-slate-950"
          style={{
            width: Math.max(8, size * 0.25),
            height: Math.max(8, size * 0.25),
          }}
        />
      )}
    </div>
  );
};

export default GuildAvatar;
