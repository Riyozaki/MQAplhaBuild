import React, { useMemo, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { selectIsPending, purchaseItemAction } from '../../store/userSlice';
import { completeQuestAction } from '../../store/questsSlice';
import { Quest } from '../../types';
import { useSoundEffects } from '../../hooks/useSoundEffects';
import { fireConfetti } from '../../utils/confetti';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { Award, ShoppingBag, CheckCircle, Coffee, Star, Clock } from 'lucide-react';
import LoadingOverlay from '../LoadingOverlay';
import Survey from '../Survey';
import HabitCard from './HabitCard';
import DailyChallengeCard from './DailyChallengeCard';

interface DashboardViewProps {
    user: any;
    quests: Quest[];
    shopItems: any[];
    onQuestSelect: (q: Quest, isBoosted?: boolean) => void;
}

const itemVar = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 50 } }
};

// Helper for seeded random
const getDailyRandomQuests = (allQuests: Quest[], user: any): Quest[] => {
    const now = new Date();
    const msPer24h = 24 * 60 * 60 * 1000; // 24 hour cycle
    const anchor = new Date('2024-01-01T00:00:00.000Z').getTime(); 
    const currentMs = now.getTime();
    const cycleIndex = Math.floor((currentMs - anchor) / msPer24h);
    
    // Cache key for today's selection
    const cacheKey = `daily_quests_${cycleIndex}_${user.grade || 'default'}`;
    
    // Try to load from cache first
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const parsedIds = JSON.parse(cached);
            const cachedQuests = allQuests.filter(q => parsedIds.includes(String(q.id)));
            if (cachedQuests.length === 6) return cachedQuests;
        }
    } catch (e) {
        console.warn("Failed to load cached daily quests", e);
    }

    const seededRandom = (seed: number) => {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    // Filter out habits and story quests. 
    // IMPORTANT: Do NOT filter out completed quests here, or they will be replaced by new ones (infinite loop).
    const pool = allQuests.filter(q => !q.isHabit && q.type !== 'story');
    
    // Adaptive Difficulty Logic
    let preferredRarity: string[] = ['Common', 'Rare', 'Epic', 'Legendary'];
    if (user.streakDays > 5) {
        preferredRarity = ['Rare', 'Epic', 'Legendary']; // Harder for high streak
    } else if (user.streakDays < 2) {
        preferredRarity = ['Common', 'Rare']; // Easier for low streak
    }

    const shuffled = [...pool].sort((a, b) => {
        // Rarity weight
        const weightA = preferredRarity.includes(a.rarity) ? 1 : 0;
        const weightB = preferredRarity.includes(b.rarity) ? 1 : 0;
        
        // Prioritize preferred rarity
        if (weightA !== weightB) return weightB - weightA;

        // Use string ID for stable seeding
        const idA = String(a.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const idB = String(b.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

        const rA = seededRandom(cycleIndex + idA);
        const rB = seededRandom(cycleIndex + idB);
        return rA - rB;
    });

    const selected = shuffled.slice(0, 6);
    
    // Cache the selection
    try {
        const selectedIds = selected.map(q => String(q.id));
        localStorage.setItem(cacheKey, JSON.stringify(selectedIds));
    } catch (e) {
        console.warn("Failed to cache daily quests", e);
    }

    return selected; 
};

// Robust check for quest completion (handles string/number IDs)
const isQuestDoneToday = (questId: string | number, questHistory: any[]): boolean => {
    if (!questHistory || !Array.isArray(questHistory)) return false;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const questIdStr = String(questId);
    
    return questHistory.some(h => 
        String(h.questId) === questIdStr && new Date(h.date) >= todayStart
    );
};

const DashboardView: React.FC<DashboardViewProps> = ({ user, quests, shopItems, onQuestSelect }) => {
    const dispatch = useDispatch<AppDispatch>();
    const { playCoins } = useSoundEffects();
    
    // Selectors
    const isPendingQuest = useSelector(selectIsPending('completeQuest'));
    const isPendingPurchase = useSelector(selectIsPending('purchase'));
    const nextRegenTime = useSelector((state: RootState) => state.user.nextRegenTime);
    
    // Derived state
    const habits = quests.filter(q => q.isHabit);
    
    // Memoize daily challenges based ONLY on the quest pool and user grade/streak (not history length)
    // We rely on the internal caching of getDailyRandomQuests to keep it stable
    const dailyChallenges = useMemo(() => getDailyRandomQuests(quests, user), [quests, user.grade, user.streakDays]);
    
    const rewards = shopItems.filter(item => item.type === 'consumable').slice(0, 4);
    const currentMp = Math.max(0, 10 - (user.dailyCompletionsCount || 0));
    const isExhausted = currentMp <= 0;
    
    // Regen Timer State
    const [regenCountdown, setRegenCountdown] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            const diff = nextRegenTime - Date.now();
            if (diff <= 0) {
                setRegenCountdown('Ready');
            } else {
                const m = Math.floor(diff / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setRegenCountdown(`${m}:${s.toString().padStart(2, '0')}`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [nextRegenTime]);

    const handleQuickBuy = (item: any) => {
        if (isPendingPurchase) return;
        if (user.coins >= item.cost) {
            dispatch(purchaseItemAction(item)).unwrap().then(() => {
                fireConfetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });
            });
        }
    };

    const handleHabitComplete = (q: Quest) => {
        if (isQuestDoneToday(q.id, user.questHistory) || isPendingQuest) return;
        
        dispatch(completeQuestAction({ quest: q, multiplier: 1, isAutoComplete: true })).unwrap().then(() => {
            fireConfetti({ 
                particleCount: 30, 
                spread: 40, 
                origin: { y: 0.5 }, 
                colors: ['#22c55e', '#ffffff'] 
            });
            toast.success(`${q.title} выполнено! +${q.coins} монет`);
        });
    };

    return (
        <div className="space-y-8">
            {/* Hero Header Stats */}
            <motion.div variants={itemVar} initial="hidden" animate="show" className="tour-step-1 glass-panel p-6 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/20 blur-[100px] rounded-full"></div>
                <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shrink-0">
                        <span className="text-3xl font-black text-white">{user.level}</span>
                    </div>
                    <div className="flex-1 w-full space-y-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <h2 className="text-2xl font-bold text-white">{user.username}</h2>
                                <p className="text-sm text-slate-400">Герой {user.grade || 5} класса</p>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-black text-amber-400">{user.coins} 💰</span>
                            </div>
                        </div>
                        
                        {/* Bars */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
                                    <span>HP (Здоровье)</span>
                                    <span>{user.currentHp || 50} / 100</span>
                                </div>
                                <div className="h-3 bg-slate-800 rounded-full overflow-hidden relative">
                                    <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${((user.currentHp || 50) / 100) * 100}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
                                    <span>XP (Опыт)</span>
                                    <span>{user.currentXp} / {user.nextLevelXp}</span>
                                </div>
                                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-400" style={{ width: `${Math.min(100, (Number(user.currentXp) / Number(user.nextLevelXp)) * 100)}%` }}></div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
                                <span>MP (Энергия Дня)</span>
                                <div className="flex items-center gap-1">
                                    <span className={regenCountdown !== 'Ready' ? 'text-blue-300' : 'text-slate-500'}>
                                        {currentMp < 10 && <><Clock size={10} className="inline mr-1" />+1 in {regenCountdown}</>}
                                    </span>
                                    <span>{currentMp} / 10</span>
                                </div>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className={`h-full w-full transition-all duration-500 ${isExhausted ? 'bg-slate-600' : 'bg-blue-400'}`} style={{ width: `${(currentMp / 10) * 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Mood Tracker */}
            <Survey />

            {/* Columns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                
                {/* 1. Habits (Routine) */}
                <div className="tour-step-3 glass-panel p-5 rounded-2xl min-h-[400px] border border-slate-700/50">
                    <h3 className="text-blue-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                        <CheckCircle size={18} /> Привычки
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">Твоя дисциплина — твоя сила.</p>
                    <div className="space-y-1">
                        {habits.map(q => (
                            <HabitCard 
                                key={q.id} 
                                q={q} 
                                streak={user.habitStreaks?.[q.id] || 0}
                                isDone={isQuestDoneToday(q.id, user.questHistory)}
                                isPendingQuest={isPendingQuest}
                                isExhausted={isExhausted}
                                onComplete={handleHabitComplete}
                            />
                        ))}
                        {habits.length === 0 && <div className="text-slate-500 text-xs text-center py-4">Нет активных привычек</div>}
                    </div>
                </div>

                {/* 2. Daily Challenges */}
                <div className={`tour-step-2 glass-panel p-5 rounded-2xl min-h-[400px] border border-purple-500/30 bg-purple-900/10 ${isExhausted ? 'opacity-70' : ''}`}>
                    <h3 className="text-purple-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                        <Award size={18} /> Испытания Дня
                    </h3>
                    <p className="text-xs text-purple-300/60 mb-4">Обновление: 00:00 UTC. Бонус x1.5!</p>
                    
                    <div className="space-y-2">
                        {dailyChallenges.map(q => (
                            <DailyChallengeCard 
                                key={q.id} 
                                q={q}
                                isDone={isQuestDoneToday(q.id, user.questHistory)}
                                isExhausted={isExhausted}
                                isPendingQuest={isPendingQuest}
                                onSelect={onQuestSelect}
                            />
                        ))}
                        {isExhausted && <div className="text-red-400 text-xs text-center font-bold mt-4">Энергия иссякла (0 MP)</div>}
                    </div>
                </div>

                {/* 3. Rewards */}
                <LoadingOverlay isLoading={isPendingPurchase} className="h-full rounded-2xl">
                <div className="glass-panel p-5 rounded-2xl min-h-[400px] border border-slate-700/50">
                    <h3 className="text-emerald-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                        <ShoppingBag size={18} /> Награды
                    </h3>
                    <div className="space-y-3">
                        {rewards.map(item => (
                            <div key={item.id} className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 text-center flex flex-col items-center">
                                <div className="mb-2 text-amber-500">
                                    {item.icon === 'Coffee' ? <Coffee /> : <Star />}
                                </div>
                                <h4 className="text-sm font-bold text-white mb-1">{item.name}</h4>
                                <button 
                                    onClick={() => handleQuickBuy(item)}
                                    disabled={user.coins < item.cost || isPendingPurchase}
                                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border w-full mt-1 flex justify-center items-center gap-1 ${
                                        user.coins >= item.cost 
                                        ? 'border-amber-500 text-amber-400 hover:bg-amber-900/30' 
                                        : 'border-slate-600 text-slate-500 cursor-not-allowed'
                                    }`}
                                >
                                    {item.cost} 💰
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
                </LoadingOverlay>

            </div>
        </div>
    );
};

export default DashboardView;
