/**
 * Store Items Database
 * All purchasable items: borders, themes, consumables, titles, banners.
 */

/* ═══ Types ═══ */
export type StoreCategory = 'border' | 'theme' | 'consumable' | 'title' | 'banner';
export type ItemTier = 'basic' | 'color' | 'elemental' | 'special' | 'prismatic' | 'seasonal' | 'premium' | 'legendary' | 'rank-gated';

export interface StoreItem {
  id: string;
  name: string;
  category: StoreCategory;
  tier: ItemTier;
  price: number;
  description: string;
  /** For themes: CSS variable overrides */
  themeVars?: Record<string, string>;
  /** For borders: SVG config */
  borderConfig?: BorderConfig;
  /** For borders: image path (used with mix-blend-mode: screen) */
  imageBorder?: string;
  /** For borders: scale multiplier for image overlay (default 1.0) */
  imageScale?: number;
  /** For borders: vertical offset in px (positive = down) */
  imageOffsetY?: number;
  /** For borders: CSS animation on the image overlay */
  imageAnimated?: boolean;
  /** Animation type: 'rotate' (default) or 'pulse' */
  imageAnimationType?: 'rotate' | 'pulse';
  /** For borders: Lottie JSON path */
  lottieBorder?: string;
  /** For borders: CSS aura glow config (no image needed) */
  auraConfig?: {
    colors: string[];       // glow colors
    blur: number;           // blur radius in px
    spread: number;         // spread radius in px
    animated?: boolean;     // hue-rotate animation
    pulseSpeed?: number;    // pulse animation speed in seconds
  };
  /** For titles: display styling */
  titleConfig?: TitleConfig;
  /** For consumables: effect */
  consumableEffect?: string;
  /** For banners: image path */
  bannerImage?: string;
  /** Rank requirement (e.g. "chad", "gigachad") */
  rankRequired?: string;
  /** Is it limited time / seasonal? */
  seasonal?: boolean;
}

export interface BorderConfig {
  colors: string[];       // gradient stops
  strokeWidth: number;
  animated: boolean;
  animationType?: 'rotate' | 'pulse' | 'dash' | 'shimmer' | 'hue-rotate';
  glowColor?: string;
  glowIntensity?: number; // 0-1
}

export interface TitleConfig {
  color: string;
  bgColor: string;
  borderColor: string;
  glow?: boolean;
}

/* ═══ BORDERS ═══ */
const BORDERS: StoreItem[] = [

  // Image-Based Borders
  {
    id: 'border-ice-img', name: 'Ice Crown', category: 'border', tier: 'elemental', price: 350,
    description: 'Frozen crystalline frost wrapping your avatar.',
    imageBorder: '/borders/ice-transparent.png',
    imageAnimated: true,
    borderConfig: { colors: ['#00BFFF', '#E0FFFF'], strokeWidth: 3, animated: false, glowColor: 'rgba(0,191,255,0.4)', glowIntensity: 0.6 },
  },
  {
    id: 'border-dragon-img', name: 'Dragon Coil', category: 'border', tier: 'legendary', price: 500,
    description: 'A mythic water dragon coils around your profile.',
    imageBorder: '/borders/dragon.png',
    borderConfig: { colors: ['#60A5FA', '#93C5FD'], strokeWidth: 3, animated: false, glowColor: 'rgba(96,165,250,0.4)', glowIntensity: 0.7 },
  },
  {
    id: 'border-starcrown-img', name: 'Star Crown', category: 'border', tier: 'premium', price: 400,
    description: 'Celestial stars orbiting your portrait like a crown.',
    imageBorder: '/borders/rotate.png',
    imageAnimated: true,
    imageAnimationType: 'pulse',
    borderConfig: { colors: ['#E2E8F0', '#94A3B8'], strokeWidth: 3, animated: false, glowColor: 'rgba(226,232,240,0.4)', glowIntensity: 0.5 },
  },
  {
    id: 'border-shadowthrone-img', name: 'Shadow Throne', category: 'border', tier: 'legendary', price: 500,
    description: 'Ornate dark-magic thorns weaving a royal frame.',
    imageBorder: '/borders/purple.png',
    borderConfig: { colors: ['#C084FC', '#A855F7'], strokeWidth: 3, animated: false, glowColor: 'rgba(192,132,252,0.4)', glowIntensity: 0.7 },
  },



  // Lottie Animated Borders
  {
    id: 'border-lottie-celestial', name: 'Celestial Flame', category: 'border', tier: 'legendary', price: 800,
    description: 'A mesmerizing animated flame ring from another realm.',
    lottieBorder: '/borders/lottie-border.json',
    borderConfig: { colors: ['#F59E0B', '#EF4444', '#C8A84E'], strokeWidth: 3, animated: false, glowColor: 'rgba(245,158,11,0.5)', glowIntensity: 0.8 },
  },

  {
    id: 'border-elemental-tide', name: 'Elemental Tide', category: 'border', tier: 'legendary', price: 700,
    description: 'Japanese waves and sacred flames entwine around your avatar.',
    imageBorder: '/borders/border-mixed.png',
    imageScale: 0.9,
    borderConfig: { colors: ['#1E90FF', '#FF6347', '#C8A84E'], strokeWidth: 3, animated: false, glowColor: 'rgba(30,144,255,0.4)', glowIntensity: 0.7 },
  },
  {
    id: 'border-gold-dragon', name: 'Gold Dragon', category: 'border', tier: 'legendary', price: 900,
    description: 'An ancient golden dragon coils around your avatar — ultimate power.',
    imageBorder: '/borders/border-golddragon.png',
    borderConfig: { colors: ['#C8A84E', '#F59E0B', '#DAA520'], strokeWidth: 3, animated: false, glowColor: 'rgba(200,168,78,0.5)', glowIntensity: 0.8 },
  },
  {
    id: 'border-gold-lion', name: 'Gold Lion', category: 'border', tier: 'legendary', price: 850,
    description: 'A majestic golden lion crowns your avatar — royalty unleashed.',
    imageBorder: '/borders/border-goldlion.png',
    imageScale: 1.5,
    borderConfig: { colors: ['#C8A84E', '#0E8585', '#DAA520'], strokeWidth: 3, animated: false, glowColor: 'rgba(200,168,78,0.45)', glowIntensity: 0.8 },
  },
  {
    id: 'border-gold-eagle', name: 'Golden Eagle', category: 'border', tier: 'legendary', price: 950,
    description: 'Bronze wings of an apex predator crown your avatar — soar above all.',
    imageBorder: '/borders/border-eagle.png',
    imageScale: 1.4,
    imageOffsetY: 5,
    borderConfig: { colors: ['#B87333', '#C8A84E', '#DAA520'], strokeWidth: 3, animated: false, glowColor: 'rgba(184,115,51,0.5)', glowIntensity: 0.8 },
  },
  {
    id: 'border-phoenix', name: 'Phoenix Blaze', category: 'border', tier: 'legendary', price: 900,
    description: 'A golden phoenix rises from the flames — reborn in glory.',
    imageBorder: '/borders/border-phoenix.png',
    imageScale: 1.05,
    borderConfig: { colors: ['#DAA520', '#FF8C00', '#FFD700'], strokeWidth: 3, animated: false, glowColor: 'rgba(218,165,32,0.5)', glowIntensity: 0.8 },
  },
  {
    id: 'border-stitched-dragon', name: 'Stitched Dragon', category: 'border', tier: 'legendary', price: 850,
    description: 'A crimson dragon coils in stitched leather and gold — ancient fury.',
    imageBorder: '/borders/border-stitched-dragon.png',
    imageScale: 1.08,
    borderConfig: { colors: ['#8B0000', '#C8A84E', '#FF4500'], strokeWidth: 3, animated: false, glowColor: 'rgba(139,0,0,0.5)', glowIntensity: 0.8 },
  },
  {
    id: 'border-frost-tech', name: 'Frost Tech', category: 'border', tier: 'legendary', price: 800,
    description: 'Cryo-tech crystals and snowflakes forge a futuristic ice frame.',
    imageBorder: '/borders/border-frost-tech.png',
    imageScale: 1.1,
    borderConfig: { colors: ['#00CED1', '#87CEEB', '#E0FFFF'], strokeWidth: 3, animated: false, glowColor: 'rgba(0,206,209,0.5)', glowIntensity: 0.8 },
  },
];



/* ═══ THEMES ═══ */
const THEMES: StoreItem[] = [
  // Default (free)
  {
    id: 'theme-default', name: 'Default Gold', category: 'theme', tier: 'basic', price: 0,
    description: 'The original Lynx gold — classic and bold.',
    themeVars: { '--primary': '#C8A84E', '--primary-rgb': '200,168,78', '--surface': '#12141a', '--bg': '#0a0a0f', '--border': 'rgba(200,168,78,0.08)', '--accent-gradient': 'linear-gradient(135deg, #C8A84E, #D4B04A)' },
  },

  // Color (100 LC)
  {
    id: 'theme-crimson', name: 'Crimson Night', category: 'theme', tier: 'color', price: 100,
    description: 'Deep red accents on midnight black.',
    themeVars: { '--primary': '#DC2626', '--primary-rgb': '220,38,38', '--surface': '#1a0808', '--bg': '#0a0000', '--border': 'rgba(220,38,38,0.15)' },
  },
  {
    id: 'theme-emerald', name: 'Emerald Dark', category: 'theme', tier: 'color', price: 100,
    description: 'Rich green tones — nature meets luxury.',
    themeVars: { '--primary': '#10B981', '--primary-rgb': '16,185,129', '--surface': '#061a12', '--bg': '#000a06', '--border': 'rgba(16,185,129,0.15)' },
  },
  {
    id: 'theme-sapphire', name: 'Sapphire Night', category: 'theme', tier: 'color', price: 100,
    description: 'Cool blue hues — calm and focused.',
    themeVars: { '--primary': '#3B82F6', '--primary-rgb': '59,130,246', '--surface': '#0a1428', '--bg': '#000818', '--border': 'rgba(59,130,246,0.15)' },
  },
  {
    id: 'theme-amber', name: 'Amber Flame', category: 'theme', tier: 'color', price: 100,
    description: 'Warm amber glow — fiery and bold.',
    themeVars: { '--primary': '#F59E0B', '--primary-rgb': '245,158,11', '--surface': '#1a1400', '--bg': '#0a0a00', '--border': 'rgba(245,158,11,0.15)' },
  },
  {
    id: 'theme-rose', name: 'Rose Gold', category: 'theme', tier: 'color', price: 100,
    description: 'Elegant pink-gold — premium and soft.',
    themeVars: { '--primary': '#F472B6', '--primary-rgb': '244,114,182', '--surface': '#1a0a14', '--bg': '#0a0008', '--border': 'rgba(244,114,182,0.15)' },
  },
  {
    id: 'theme-violet', name: 'Violet Dusk', category: 'theme', tier: 'color', price: 100,
    description: 'Twilight purple — mysterious and sleek.',
    themeVars: { '--primary': '#8B5CF6', '--primary-rgb': '139,92,246', '--surface': '#120a1e', '--bg': '#08041a', '--border': 'rgba(139,92,246,0.15)' },
  },
  {
    id: 'theme-ocean', name: 'Ocean Blue', category: 'theme', tier: 'color', price: 100,
    description: 'Deep ocean teal — fresh and modern.',
    themeVars: { '--primary': '#06B6D4', '--primary-rgb': '6,182,212', '--surface': '#041a1e', '--bg': '#000a0e', '--border': 'rgba(6,182,212,0.15)' },
  },
  {
    id: 'theme-silver', name: 'Silver Frost', category: 'theme', tier: 'color', price: 100,
    description: 'Neutral silver — clean and minimal.',
    themeVars: { '--primary': '#94A3B8', '--primary-rgb': '148,163,184', '--surface': '#14161a', '--bg': '#0a0a0e', '--border': 'rgba(148,163,184,0.15)' },
  },

  // Pale / Muted (100 LC)
  {
    id: 'theme-dusty-rose', name: 'Dusty Rose', category: 'theme', tier: 'color', price: 100,
    description: 'Soft muted pink — gentle and elegant.',
    themeVars: { '--primary': '#C9A0A0', '--primary-rgb': '201,160,160', '--surface': '#1a1214', '--bg': '#0e0a0b', '--border': 'rgba(201,160,160,0.12)' },
  },
  {
    id: 'theme-sage', name: 'Sage Green', category: 'theme', tier: 'color', price: 100,
    description: 'Earthy pale green — calm and grounded.',
    themeVars: { '--primary': '#9CB8A0', '--primary-rgb': '156,184,160', '--surface': '#121a14', '--bg': '#0a0e0b', '--border': 'rgba(156,184,160,0.12)' },
  },
  {
    id: 'theme-lavender', name: 'Lavender Mist', category: 'theme', tier: 'color', price: 100,
    description: 'Soft pale purple — dreamy and soothing.',
    themeVars: { '--primary': '#B0A0C8', '--primary-rgb': '176,160,200', '--surface': '#14121a', '--bg': '#0b0a0e', '--border': 'rgba(176,160,200,0.12)' },
  },
  {
    id: 'theme-powder-blue', name: 'Powder Blue', category: 'theme', tier: 'color', price: 100,
    description: 'Light muted blue — cool and peaceful.',
    themeVars: { '--primary': '#9EBAD4', '--primary-rgb': '158,186,212', '--surface': '#12161a', '--bg': '#0a0c0e', '--border': 'rgba(158,186,212,0.12)' },
  },
  {
    id: 'theme-sand', name: 'Desert Sand', category: 'theme', tier: 'color', price: 100,
    description: 'Warm beige-tan — subtle and refined.',
    themeVars: { '--primary': '#C4B49A', '--primary-rgb': '196,180,154', '--surface': '#1a1812', '--bg': '#0e0c0a', '--border': 'rgba(196,180,154,0.12)' },
  },

  // Special (200 LC)
  {
    id: 'theme-carbon', name: 'Carbon Fiber', category: 'theme', tier: 'special', price: 200,
    description: 'Textured dark carbon with grey accents.',
    themeVars: { '--primary': '#9CA3AF', '--primary-rgb': '156,163,175', '--surface': '#1a1a1a', '--bg': '#0d0d0d', '--border': 'rgba(156,163,175,0.12)' },
  },
  {
    id: 'theme-platinum', name: 'Platinum', category: 'theme', tier: 'special', price: 200,
    description: 'Brilliant white-silver — ultra-premium.',
    themeVars: { '--primary': '#E5E7EB', '--primary-rgb': '229,231,235', '--surface': '#18181b', '--bg': '#09090b', '--border': 'rgba(229,231,235,0.12)' },
  },
  {
    id: 'theme-obsidian', name: 'Obsidian', category: 'theme', tier: 'special', price: 200,
    description: 'Pure black with sharp gold accents.',
    themeVars: { '--primary': '#C8A84E', '--primary-rgb': '200,168,78', '--surface': '#0a0a0a', '--bg': '#000000', '--border': 'rgba(200,168,78,0.1)' },
  },
  {
    id: 'theme-chrome', name: 'Midnight Chrome', category: 'theme', tier: 'special', price: 200,
    description: 'Metallic blue chrome — futuristic edge.',
    themeVars: { '--primary': '#60A5FA', '--primary-rgb': '96,165,250', '--surface': '#0f172a', '--bg': '#020617', '--border': 'rgba(96,165,250,0.12)' },
  },

  // Prismatic (400 LC)
  {
    id: 'theme-aurora', name: 'Aurora Borealis', category: 'theme', tier: 'prismatic', price: 400,
    description: 'Shifting green-cyan-purple — alive and mesmerizing.',
    themeVars: { '--primary': '#34D399', '--primary-rgb': '52,211,153', '--surface': '#0a1a14', '--bg': '#040e0a', '--border': 'rgba(52,211,153,0.12)' },
  },
  {
    id: 'theme-neon', name: 'Neon Pulse', category: 'theme', tier: 'prismatic', price: 400,
    description: 'Hot pink and electric blue — cyberpunk vibes.',
    themeVars: { '--primary': '#EC4899', '--primary-rgb': '236,72,153', '--surface': '#1a0a18', '--bg': '#0a0410', '--border': 'rgba(236,72,153,0.15)' },
  },
  {
    id: 'theme-solar', name: 'Solar Flare', category: 'theme', tier: 'prismatic', price: 400,
    description: 'Warm yellow-orange-red pulsing glow.',
    themeVars: { '--primary': '#FB923C', '--primary-rgb': '251,146,60', '--surface': '#1a1008', '--bg': '#0a0804', '--border': 'rgba(251,146,60,0.15)' },
  },
  {
    id: 'theme-cosmic', name: 'Cosmic Drift', category: 'theme', tier: 'prismatic', price: 400,
    description: 'Deep purple with starlight white accents.',
    themeVars: { '--primary': '#A78BFA', '--primary-rgb': '167,139,250', '--surface': '#0e0a1e', '--bg': '#06041a', '--border': 'rgba(167,139,250,0.12)' },
  },

  // Seasonal (150 LC)
  {
    id: 'theme-winter', name: 'Winter Frost', category: 'theme', tier: 'seasonal', price: 150,
    description: 'Ice blue and white — crisp winter energy.', seasonal: true,
    themeVars: { '--primary': '#7DD3FC', '--primary-rgb': '125,211,252', '--surface': '#0c1929', '--bg': '#040e1a', '--border': 'rgba(125,211,252,0.12)' },
  },
  {
    id: 'theme-spring', name: 'Spring Bloom', category: 'theme', tier: 'seasonal', price: 150,
    description: 'Soft pink-green — fresh renewal.', seasonal: true,
    themeVars: { '--primary': '#FB7185', '--primary-rgb': '251,113,133', '--surface': '#1a0e12', '--bg': '#0a0608', '--border': 'rgba(251,113,133,0.12)' },
  },
  {
    id: 'theme-summer', name: 'Summer Heat', category: 'theme', tier: 'seasonal', price: 150,
    description: 'Warm orange-gold — sun-kissed glow.', seasonal: true,
    themeVars: { '--primary': '#FBBF24', '--primary-rgb': '251,191,36', '--surface': '#1a1608', '--bg': '#0a0c04', '--border': 'rgba(251,191,36,0.12)' },
  },
  {
    id: 'theme-autumn', name: 'Autumn Ember', category: 'theme', tier: 'seasonal', price: 150,
    description: 'Burnt orange-brown — cozy and warm.', seasonal: true,
    themeVars: { '--primary': '#EA580C', '--primary-rgb': '234,88,12', '--surface': '#1a1008', '--bg': '#0a0804', '--border': 'rgba(234,88,12,0.12)' },
  },

  // ═══ PREMIUM GRADIENT THEMES (600 LC) ═══
  {
    id: 'theme-grad-inferno', name: 'Inferno Gradient', category: 'theme', tier: 'legendary', price: 600,
    description: 'Fire-to-gold gradient — molten power.',
    themeVars: { '--primary': '#EF4444', '--primary-rgb': '239,68,68', '--surface': '#1a0c06', '--bg': '#0c0402', '--border': 'rgba(239,68,68,0.15)', '--accent-gradient': 'linear-gradient(135deg, #EF4444, #F59E0B, #FBBF24)' },
  },
  {
    id: 'theme-grad-ocean', name: 'Deep Ocean Gradient', category: 'theme', tier: 'legendary', price: 600,
    description: 'Cyan-to-indigo depths — serene and powerful.',
    themeVars: { '--primary': '#06B6D4', '--primary-rgb': '6,182,212', '--surface': '#04101a', '--bg': '#020810', '--border': 'rgba(6,182,212,0.15)', '--accent-gradient': 'linear-gradient(135deg, #06B6D4, #3B82F6, #6366F1)' },
  },
  {
    id: 'theme-grad-aurora', name: 'Northern Lights', category: 'theme', tier: 'legendary', price: 600,
    description: 'Green-cyan-purple aurora shimmer — ethereal.',
    themeVars: { '--primary': '#34D399', '--primary-rgb': '52,211,153', '--surface': '#061a14', '--bg': '#020e0a', '--border': 'rgba(52,211,153,0.15)', '--accent-gradient': 'linear-gradient(135deg, #34D399, #06B6D4, #8B5CF6)' },
  },
  {
    id: 'theme-grad-sunset', name: 'Sunset Blaze', category: 'theme', tier: 'legendary', price: 600,
    description: 'Pink-orange-gold sunset sky — warm luxury.',
    themeVars: { '--primary': '#FB7185', '--primary-rgb': '251,113,133', '--surface': '#1a0a10', '--bg': '#0c0408', '--border': 'rgba(251,113,133,0.15)', '--accent-gradient': 'linear-gradient(135deg, #FB7185, #F97316, #FBBF24)' },
  },
  {
    id: 'theme-grad-toxic', name: 'Toxic Neon', category: 'theme', tier: 'legendary', price: 600,
    description: 'Electric green-to-cyan — radioactive energy.',
    themeVars: { '--primary': '#22C55E', '--primary-rgb': '34,197,94', '--surface': '#061a0c', '--bg': '#020e04', '--border': 'rgba(34,197,94,0.15)', '--accent-gradient': 'linear-gradient(135deg, #22C55E, #06B6D4, #3B82F6)' },
  },
];

/* ═══ CONSUMABLES ═══ */
const CONSUMABLES: StoreItem[] = [
  {
    id: 'boost-2x', name: '2× XP Shake', category: 'consumable', tier: 'basic', price: 75,
    description: 'Double XP from workouts for 24 hours.',
    consumableEffect: 'xp-2x',
  },
  {
    id: 'boost-3x', name: '3× XP Mega Shake', category: 'consumable', tier: 'special', price: 150,
    description: 'Triple XP from workouts for 24 hours.',
    consumableEffect: 'xp-3x',
  },
  {
    id: 'streak-shield', name: 'Streak Shield', category: 'consumable', tier: 'basic', price: 100,
    description: 'Protects your streak if you miss one day.',
    consumableEffect: 'streak-shield',
  },
  {
    id: 'scan-token', name: 'Extra Scan Token', category: 'consumable', tier: 'basic', price: 50,
    description: 'One bonus face scan beyond the daily limit.',
    consumableEffect: 'scan-token',
  },
  {
    id: 'spotlight', name: 'Leaderboard Spotlight', category: 'consumable', tier: 'premium', price: 200,
    description: 'Your name glows gold on the leaderboard for 7 days.',
    consumableEffect: 'spotlight',
  },
];

/* ═══ TITLES ═══ */
const TITLES: StoreItem[] = [
  {
    id: 'title-grinder', name: 'Grinder', category: 'title', tier: 'basic', price: 100,
    description: 'Show the world you never skip a day.',
    titleConfig: { color: '#F59E0B', bgColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' },
  },
  {
    id: 'title-sigma', name: 'Sigma', category: 'title', tier: 'basic', price: 150,
    description: 'Walk your own path.',
    titleConfig: { color: '#8B5CF6', bgColor: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.3)' },
  },
  {
    id: 'title-beast', name: 'Beast Mode', category: 'title', tier: 'special', price: 200,
    description: 'Unleash your inner beast.',
    titleConfig: { color: '#EF4444', bgColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' },
  },
  {
    id: 'title-ascended', name: 'Ascended', category: 'title', tier: 'special', price: 300,
    description: 'You\'ve transcended the average.',
    titleConfig: { color: '#10B981', bgColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' },
  },
  {
    id: 'title-elite', name: 'Lynx Elite', category: 'title', tier: 'premium', price: 500,
    description: 'The ultimate flex — you\'re the apex.',
    titleConfig: { color: '#C8A84E', bgColor: 'rgba(200,168,78,0.15)', borderColor: 'rgba(200,168,78,0.4)', glow: true },
  },
];

/* ═══ BANNERS ═══ */
const BANNERS: StoreItem[] = [
  {
    id: 'banner-default', name: 'Lynx Default', category: 'banner', tier: 'basic', price: 0,
    description: 'The official Lynx AI banner — included free for all users.',
    bannerImage: '/banners/default.jpg',
  },
  {
    id: 'banner-mclaren', name: 'McLaren Senna', category: 'banner', tier: 'premium', price: 300,
    description: 'White McLaren Senna — pure speed, pure elegance.',
    bannerImage: '/banners/banner1.jpg',
  },
  {
    id: 'banner-hotlooks', name: 'He Looks Hot', category: 'banner', tier: 'special', price: 200,
    description: 'Damn — turn heads wherever you go.',
    bannerImage: '/banners/banner2.jpg',
  },
  {
    id: 'banner-noenemies', name: 'No Enemies', category: 'banner', tier: 'special', price: 250,
    description: 'You don\'t have enemies — manga katana motivation.',
    bannerImage: '/banners/banner3.jpg',
  },
  {
    id: 'banner-porsche', name: 'Porsche 911 JDM', category: 'banner', tier: 'premium', price: 350,
    description: 'Porsche 911 meets Japanese waves and cherry blossoms.',
    bannerImage: '/banners/banner4.jpg',
  },
  {
    id: 'banner-fineshyt', name: 'Fine Shyt', category: 'banner', tier: 'premium', price: 300,
    description: 'Dark anime aesthetic — you already know.',
    bannerImage: '/banners/banner5.jpg',
  },
  {
    id: 'banner-chico', name: 'Model of the Year', category: 'banner', tier: 'legendary', price: 400,
    description: 'Chico Lachowski — the face that broke the internet.',
    bannerImage: '/banners/banner6.jpg',
  },
];

/* ═══ ALL ITEMS ═══ */
export const ALL_STORE_ITEMS: StoreItem[] = [
  ...BORDERS,
  ...THEMES,
  ...CONSUMABLES,
  ...TITLES,
  ...BANNERS,
];

export function getItemsByCategory(cat: StoreCategory): StoreItem[] {
  return ALL_STORE_ITEMS.filter(i => i.category === cat);
}

export function getItemById(id: string): StoreItem | undefined {
  return ALL_STORE_ITEMS.find(i => i.id === id);
}

/* ═══ Rotating Deals ═══ */
export function getTodaysDeals(count = 4): { item: StoreItem; discount: number }[] {
  // Seed based on date so deals are consistent throughout the day
  const seed = parseInt(new Date().toISOString().split('T')[0].replace(/-/g, ''), 10);
  const shuffled = [...ALL_STORE_ITEMS]
    .filter(i => i.category !== 'consumable') // consumables are always available
    .sort((a, b) => {
      const hashA = (seed * 31 + a.id.charCodeAt(0)) % 1000;
      const hashB = (seed * 31 + b.id.charCodeAt(0)) % 1000;
      return hashA - hashB;
    });

  return shuffled.slice(0, count).map((item, i) => ({
    item,
    discount: [25, 30, 33, 40][i % 4],
  }));
}
