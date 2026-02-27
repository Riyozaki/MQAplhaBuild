import { Sword, Sparkles, Target, Heart, Map, Ghost, Zap, Shield, Compass, Flame, Cpu } from 'lucide-react';

// Standard Class Skins
export const AVATAR_OPTIONS = [
  { id: 'warrior', icon: Sword, label: 'Воин', color: 'from-red-500 to-orange-600' },
  { id: 'mage', icon: Sparkles, label: 'Маг', color: 'from-purple-500 to-indigo-600' },
  { id: 'rogue', icon: Target, label: 'Лучник', color: 'from-emerald-500 to-teal-600' },
  { id: 'cleric', icon: Heart, label: 'Целитель', color: 'from-pink-500 to-rose-600' },
  { id: 'explorer', icon: Map, label: 'Искатель', color: 'from-blue-500 to-cyan-600' },
];

// Unique Premium Skins
export const PREMIUM_SKINS = [
    { id: 'skin_ninja', icon: Ghost, label: 'Тень Знаний', color: 'from-slate-700 to-black border-slate-500' },
    { id: 'skin_wizard', icon: Zap, label: 'Архимаг', color: 'from-fuchsia-600 to-purple-900 border-fuchsia-400' },
    { id: 'skin_paladin', icon: Shield, label: 'Рыцарь Пера', color: 'from-amber-300 to-yellow-600 border-amber-400' },
    { id: 'skin_ranger', icon: Compass, label: 'Следопыт Времён', color: 'from-green-600 to-emerald-900 border-green-400' },
    { id: 'skin_dragon', icon: Flame, label: 'Повелитель Драконов', color: 'from-red-600 to-rose-900 border-red-400' },
    { id: 'skin_cyber', icon: Cpu, label: 'Кибер-Учёный', color: 'from-cyan-400 to-blue-900 border-cyan-300' },
];

export const getAvatarData = (avatarId: string) => {
    let data = AVATAR_OPTIONS.find(a => a.id === avatarId);
    if (!data) {
        data = PREMIUM_SKINS.find(a => a.id === avatarId);
    }
    if (!data) {
        data = AVATAR_OPTIONS[0]; // Fallback
    }
    return data;
};
