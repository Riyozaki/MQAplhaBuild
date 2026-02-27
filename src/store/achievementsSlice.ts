import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from './index';
import { api } from '../services/api';
import { audio } from '../services/audio';
import { toast } from 'react-toastify';
import { addExperience } from './userSlice';

export const checkAchievements = createAsyncThunk(
    'achievements/checkAchievements',
    async (_, { getState, dispatch }) => {
        const state = getState() as RootState;
        const user = state.user.currentUser;
        const allAchievements = state.rewards.achievements;
        
        if (!user || !user.email) return;

        const newUnlocked: string[] = [];
        let totalRewardXp = 0;
        let totalRewardCoins = 0;

        allAchievements.forEach(ach => {
            if (user.achievements.includes(ach.id)) return;
            let unlocked = false;
            switch (ach.conditionType) {
                case 'quests': if (user.completedQuests >= ach.threshold) unlocked = true; break;
                case 'coins': if (user.coins >= ach.threshold) unlocked = true; break;
                case 'xp':
                     if (ach.id === 'ach_lvl2' && user.level >= 2) unlocked = true;
                     if (ach.id === 'ach_lvl5' && user.level >= 5) unlocked = true;
                     break;
                case 'streak': if (ach.id === 'ach_streak7' && user.streakDays >= 7) unlocked = true; break;
            }

            if (unlocked) {
                newUnlocked.push(ach.id);
                totalRewardXp += ach.rewardXp;
                totalRewardCoins += ach.rewardCoins;
                // Fire and forget
                api.addAchievement(user.email, ach).catch(e => console.warn("Achievement sync delay"));
                audio.playQuestComplete(); // Achievement sound
                toast.info(`🏆 Получено достижение: ${ach.title}!`, { theme: 'dark' });
            }
        });

        if (newUnlocked.length > 0) {
            if (totalRewardXp > 0 || totalRewardCoins > 0) {
                dispatch(addExperience({ xp: totalRewardXp, coins: totalRewardCoins }));
            }
            const updates = { 
                achievements: [...user.achievements, ...newUnlocked] 
            };
            return updates;
        }
        return null;
    }
);

const achievementsSlice = createSlice({
  name: 'achievements',
  initialState: {},
  reducers: {},
});

export default achievementsSlice.reducer;