export const COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
];
export const AVATAR_STYLES = [
  { id: 'avataaars', name: 'Classic' },
];
// Split tops into Short (Type A) and Long (Type B) for better UX
// Updated to match DiceBear v9 schema
export const AVATAR_TOPS_SHORT = [
  'dreads01', 'dreads02', 'frizzle', 'shaggyMullet', 'shortCurly',
  'shortFlat', 'shortRound', 'shortWaved', 'sides', 'theCaesar',
  'theCaesarSidePart', 'turban', 'winterHat1', 'winterHat2', 'winterHat3', 'winterHat4'
];
export const AVATAR_TOPS_LONG = [
  'bigHair', 'bob', 'bun', 'curly', 'curvy', 'dreads', 'frida', 'fro',
  'froBand', 'longNotTooLong', 'miaWallace', 'shavedSides', 'straight01',
  'straight02', 'straightStrand', 'hijab'
];
export const AVATAR_OPTIONS = {
  // Combined list for validation
  top: [...new Set([...AVATAR_TOPS_SHORT, ...AVATAR_TOPS_LONG])],
  // Removed 'none' as it is invalid in v9 API (use probability=0 instead)
  accessories: [
    'eyepatch', 'kurt', 'prescription01', 'prescription02', 'round',
    'sunglasses', 'wayfarers'
  ],
  hairColor: [
    'auburn', 'black', 'blonde', 'blondeGolden', 'brown', 'brownDark',
    'pastelPink', 'platinum', 'red', 'silverGray'
  ],
  // Removed 'none'
  facialHair: [
    'beardLight', 'beardMajestic', 'beardMedium', 'moustacheFancy',
    'moustacheMagnum'
  ],
  clothing: [
    'blazerAndShirt', 'blazerAndSweater', 'collarAndSweater', 'graphicShirt',
    'hoodie', 'overall', 'shirtCrewNeck', 'shirtScoopNeck', 'shirtVNeck'
  ],
  clothingColor: [
    'black', 'blue01', 'blue02', 'blue03', 'gray01', 'gray02',
    'heather', 'pastelBlue', 'pastelGreen', 'pastelOrange', 'pastelRed',
    'pastelYellow', 'pink', 'red', 'white'
  ],
  eyes: [
    'closed', 'cry', 'default', 'dizzy', 'eyeRoll', 'happy', 'hearts',
    'side', 'squint', 'surprised', 'wink', 'winkWacky'
  ],
  eyebrows: [
    'angry', 'angryNatural', 'default', 'defaultNatural', 'flatNatural',
    'frownNatural', 'raisedExcited', 'raisedExcitedNatural', 'sadConcerned',
    'sadConcernedNatural', 'unibrowNatural', 'upDown', 'upDownNatural'
  ],
  mouth: [
    'concerned', 'default', 'disbelief', 'eating', 'grimace', 'sad',
    'screamOpen', 'serious', 'smile', 'tongue', 'twinkle', 'vomit'
  ],
  skinColor: [
    'tanned', 'yellow', 'pale', 'light', 'brown', 'darkBrown', 'black'
  ]
};
// Season Pass Configuration
export const SEASON_NAME = "Holiday Season";
export const SEASON_END_DATE = "2025-12-31"; // Using 2025 to ensure it's active for demo purposes
export const SEASON_COST = 950;
export const SEASON_LEVELS = 30;
export const SEASON_REWARDS_CONFIG = Array.from({ length: SEASON_LEVELS }, (_, i) => {
  const level = i + 1;
  const isMilestone = level % 5 === 0;
  // Default generation logic
  let freeReward = {
      type: isMilestone ? 'box' : (level % 2 !== 0 ? 'coins' : 'none'),
      amount: isMilestone ? 1 : (level % 2 !== 0 ? 50 : 0),
      label: isMilestone ? 'Mystery Box' : (level % 2 !== 0 ? '50 Coins' : ''),
      itemId: isMilestone ? 'box_common' : undefined
  };
  let premiumReward = {
      type: isMilestone ? (level === 30 ? 'title' : 'box') : 'coins',
      amount: isMilestone ? 1 : 100,
      label: level === 30 ? 'Legendary Title' : (isMilestone ? 'Epic Box' : '100 Coins'),
      iconName: level === 30 ? 'Crown' : (isMilestone ? 'Box' : 'Coins'),
      itemId: level === 30 ? 'title_legendary' : (isMilestone ? 'box_rare' : undefined)
  };
  // Overrides for Santa's Coming Season
  if (level === 5) {
      premiumReward = { type: 'avatar', amount: 1, label: 'Elf Avatar', iconName: 'User', itemId: 'av_elf' };
  }
  if (level === 10) {
      freeReward = { type: 'frame', amount: 1, label: 'Holiday Frame', itemId: 'fr_holiday' };
  }
  if (level === 15) {
      premiumReward = { type: 'banner', amount: 1, label: 'Winter Banner', iconName: 'Image', itemId: 'bn_winter' };
  }
  if (level === 20) {
      premiumReward = { type: 'title', amount: 1, label: 'Santa\'s Helper', iconName: 'Crown', itemId: 'title_santa' };
  }
  if (level === 30) {
      premiumReward = { type: 'avatar', amount: 1, label: 'Santa Avatar', iconName: 'User', itemId: 'av_santa' };
  }
  return {
    level,
    free: freeReward,
    premium: premiumReward
  };
});