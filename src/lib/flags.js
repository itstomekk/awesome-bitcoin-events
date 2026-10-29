// Flag emoji per country name, exactly as written in the list's Location column.
export const COUNTRY_FLAGS = {
  'USA': '🇺🇸', 'Germany': '🇩🇪', 'France': '🇫🇷', 'Poland': '🇵🇱',
  'Spain': '🇪🇸', 'Italy': '🇮🇹', 'Netherlands': '🇳🇱', 'Switzerland': '🇨🇭',
  'Austria': '🇦🇹', 'Czech Republic': '🇨🇿', 'UK': '🇬🇧', 'Canada': '🇨🇦',
  'Australia': '🇦🇺', 'Japan': '🇯🇵', 'El Salvador': '🇸🇻', 'Argentina': '🇦🇷',
  'Brazil': '🇧🇷', 'Mexico': '🇲🇽', 'India': '🇮🇳', 'South Africa': '🇿🇦',
  'Norway': '🇳🇴', 'Sweden': '🇸🇪', 'Finland': '🇫🇮', 'Portugal': '🇵🇹',
  'Belgium': '🇧🇪', 'Hungary': '🇭🇺', 'Romania': '🇷🇴', 'Bulgaria': '🇧🇬',
  'Greece': '🇬🇷', 'Turkey': '🇹🇷', 'Serbia': '🇷🇸', 'Slovenia': '🇸🇮',
  'Croatia': '🇭🇷', 'Slovakia': '🇸🇰', 'Lithuania': '🇱🇹', 'Latvia': '🇱🇻',
  'Estonia': '🇪🇪', 'Ireland': '🇮🇪', 'Denmark': '🇩🇰', 'New Zealand': '🇳🇿',
  'Honduras': '🇭🇳', 'Costa Rica': '🇨🇷', 'Panama': '🇵🇦', 'Colombia': '🇨🇴',
  'Chile': '🇨🇱', 'Peru': '🇵🇪', 'Uruguay': '🇺🇾', 'Paraguay': '🇵🇾',
  'Bolivia': '🇧🇴', 'Ecuador': '🇪🇨', 'Venezuela': '🇻🇪',
  'United Arab Emirates': '🇦🇪', 'South Korea': '🇰🇷', 'Taiwan': '🇹🇼',
  'Vietnam': '🇻🇳', 'Philippines': '🇵🇭', 'Malaysia': '🇲🇾', 'Thailand': '🇹🇭',
  'Mauritius': '🇲🇺', 'Puerto Rico': '🇵🇷',
  'Hong Kong': '🇭🇰', 'Indonesia': '🇮🇩', 'Kenya': '🇰🇪', 'Malawi': '🇲🇼',
  'Cyprus': '🇨🇾', 'Montenegro': '🇲🇪', 'Cayman Islands': '🇰🇾', 'Curaçao': '🇨🇼', 'Dominican Republic': '🇩🇴',
};

export const flagFor = (country) => (country ? COUNTRY_FLAGS[country] || '' : '');
