export const ELEMENT_TYPES = {
  nature: { name: 'Nature', color: '#22c55e', gradient: 'from-green-600 to-emerald-500', icon: '🌿' },
  water:  { name: 'Water',  color: '#3b82f6', gradient: 'from-blue-600 to-cyan-500',    icon: '🌊' },
  fire:   { name: 'Fire',   color: '#ef4444', gradient: 'from-red-600 to-orange-500',   icon: '🔥' },
  electric: { name: 'Electric', color: '#eab308', gradient: 'from-yellow-500 to-amber-500', icon: '⚡' },
  psychic: { name: 'Psychic', color: '#a855f7', gradient: 'from-purple-600 to-fuchsia-500', icon: '🔮' },
  fighting: { name: 'Fighting', color: '#f97316', gradient: 'from-orange-600 to-red-500', icon: '👊' },
  normal: { name: 'Normal', color: '#94a3b8', gradient: 'from-gray-500 to-slate-400', icon: '⭐' },
};

// Pokemon type → our element mapping
export const POKEMON_TYPE_MAP = {
  Grass: 'nature', Bug: 'nature', Poison: 'nature',
  Water: 'water', Ice: 'water',
  Fire: 'fire',
  Electric: 'electric',
  Psychic: 'psychic', Ghost: 'psychic', Fairy: 'psychic',
  Fighting: 'fighting', Rock: 'fighting', Ground: 'fighting',
  Normal: 'normal', Flying: 'normal', Dragon: 'normal', Steel: 'normal', Dark: 'normal',
};
