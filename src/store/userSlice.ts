import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { UserProfile, SurveySubmission, ThemeColor, QuestHistoryItem, HeroClass } from '../types';
import { toast } from 'react-toastify';
import { RootState } from './index';
import { analytics } from '../services/analytics';
import { api, BossBattlePayload } from '../services/api';
import { audio } from '../services/audio';
import { handleApiError } from '../utils/errorHandler';
import { CAMPAIGN_DATA } from '../data/campaignData';
import { CALENDAR_CONFIG } from './rewardsSlice';

// Import actions from other slices for extraReducers
import { completeQuestAction } from './questsSlice';
import { createGuild, guildDonate, leaveGuild, joinGuild, fetchMyGuild, contributeGuildQuest } from './guildSlice';

const STORAGE_KEY_EMAIL = 'motiva_user_email';

interface DailyRewardData {
    xp: number;
    coins: number;
    streak: number;
    bonusMultiplier: number;
}

export interface RewardAnimation {
    id: string;
    xp: number;
    coins: number;
}

interface PendingActions {
    completeQuest: boolean;
    purchase: boolean;
    bossBattle: boolean;
    setMood: boolean;
    updateProfile: boolean;
    auth: boolean;
    equipSkin: boolean;
    regen: boolean;
}

interface UserState {
  currentUser: UserProfile | null;
  gradeGroup: string | null;
  loading: boolean;
  error: string | null;
  dailyRewardPopup: DailyRewardData | null;
  pendingRewardAnimations: RewardAnimation[];
  pendingActions: PendingActions;
  nextRegenTime: number;
  pendingSyncCount: number; // New field for offline queue visual
}

const initialState: UserState = {
  currentUser: null,
  gradeGroup: null,
  loading: false,
  error: null,
  dailyRewardPopup: null,
  pendingRewardAnimations: [],
  pendingActions: {
      completeQuest: false,
      purchase: false,
      bossBattle: false,
      setMood: false,
      updateProfile: false,
      auth: false,
      equipSkin: false,
      regen: false
  },
  nextRegenTime: Date.now() + 60 * 1000, // Reduced to 1 minute
  pendingSyncCount: 0
};

// --- DEFAULT USER STATE ---
const DEFAULT_USER_DATA: Partial<UserProfile> = {
    role: 'student',
    avatar: 'warrior',
    level: 1,
    currentXp: 0,
    nextLevelXp: 100,
    coins: 0,
    currentHp: 100, 
    completedQuests: 0,
    inventory: [],
    achievements: [],
    questHistory: [],
    surveyHistory: [],
    hasParentalConsent: false,
    themeColor: 'purple',
    activeQuestTimers: {},
    habitStreaks: {}, 
    dailyCompletionsCount: 0,
    suspiciousFlags: 0,
    streakDays: 0,
    streakTakenToday: false,
    lastCampaignAdvanceDate: undefined,
    campaign: {
        currentDay: 1,
        isDayComplete: false,
        unlockedAllies: []
    }
};

const mapSheetToUser = (rawData: any): UserProfile => {
    if (!rawData || !rawData.user) throw new Error("Empty data");

    const { user } = rawData;
    const progress = rawData.progress || {};
    const info = rawData.info || {};
    const quests = rawData.quests || [];

    const mappedHistory: QuestHistoryItem[] = Array.isArray(quests) ? quests.map((q: any) => {
        const rawId = q.questId || q.visitorId;
        const parsedId = rawId; // Allow string IDs
        return {
            questId: parsedId,
            questTitle: q.questName || q.visitorName || 'Unknown',
            date: q.completedAt || q.timestamp || new Date().toISOString(),
            xpEarned: Number(q.xpEarned) || 0,
            coinsEarned: Number(q.coinsEarned) || 0,
            score: Number(q.score) || 0,
            category: q.category
        };
    }) : [];

    const campaignProg = info.campaignProgress && Array.isArray(info.campaignProgress) && info.campaignProgress.length > 0 
        ? info.campaignProgress[0] 
        : null;

    const campaignData = {
        currentDay: campaignProg ? Number(campaignProg.currentDay) : (Number(info.currentLevel) || 1), 
        // We do NOT trust the sheet for isDayComplete unless explicitly saved, logic below handles recalculation
        isDayComplete: false, 
        unlockedAllies: Array.isArray(info.unlockedAllies) ? info.unlockedAllies : []
    };

    // Calculate Last Mood Timestamp
    const userEmail = user.email.toLowerCase().trim();
    const localMoodTs = localStorage.getItem(`motiva_mood_ts_${userEmail}`);
    let mappedMoodDate: string | undefined = undefined;

    if (info.mood && info.mood !== 'neutral') {
        if (localMoodTs) {
             mappedMoodDate = localMoodTs;
        } else {
             mappedMoodDate = new Date(Date.now() - 20 * 60 * 1000).toISOString();
        }
    }

    // Re-verify campaign completion on load (2/3 rule)
    const currentStoryDay = CAMPAIGN_DATA.find(d => d.day === campaignData.currentDay);
    if (currentStoryDay) {
        const requiredIds = currentStoryDay.questIds;
        const completedIds = new Set(mappedHistory.map(h => h.questId));
        const completedCount = requiredIds.filter(id => completedIds.has(id)).length;
        const threshold = Math.ceil(requiredIds.length * (2/3)); // 2/3 Rule
        
        if (completedCount >= threshold) {
            campaignData.isDayComplete = true;
        }
    }

    return {
        ...DEFAULT_USER_DATA,
        email: user.email,
        username: user.username,
        grade: Number(user.grade) || 7,
        
        level: Number(progress.level) || 1,
        currentXp: Number(progress.xp) || 0,
        nextLevelXp: Number(progress.nextLevelXp) || 100,
        coins: Number(progress.coins || progress.gold) || 0,
        currentHp: Number(progress.currentHp) || 100,
        streakDays: Number(progress.streakDays || info.dailyStreak) || 0,
        lastLoginDate: progress.lastLoginDate,
        totalQuestsCompleted: Number(progress.totalQuestsCompleted) || 0,
        weeklyXp: Number(progress.weeklyXp) || 0,
        weeklyXpResetDate: progress.weeklyXpResetDate,
        tutorialCompleted: progress.tutorialCompleted === true || progress.tutorialCompleted === 'true',
        
        avatar: progress.visitorAvatar || 'warrior',
        heroClass: info.heroClass || undefined,
        className: progress.className,
        classEmoji: progress.classEmoji,
        currentLocation: progress.currentLocation || 'forest',
        themeColor: info.selectedTheme || info.interfaceColor || 'purple',
        
        inventory: Array.isArray(info.purchases) ? info.purchases.map((p: any) => p.itemId) : [],
        achievements: Array.isArray(info.achievements) ? info.achievements.map((a: any) => a.id) : [],
        questHistory: mappedHistory,
        habitStreaks: info.habitStreaks || {}, // Important: Map streaks from DB
        surveyHistory: Array.isArray(info.surveyHistory) ? info.surveyHistory : [],
        campaign: campaignData,
        lastCampaignAdvanceDate: info.lastCampaignAdvanceDate,
        
        lastDailyMood: mappedMoodDate,
        completedQuests: mappedHistory.length,
        hasParentalConsent: true,

        // Guilds
        guildId: info.guildId || undefined,
        guildName: info.guildName || undefined,
        guildRole: info.guildRole || undefined,
        guildXPContributed: Number(info.guildXPContributed) || 0,
    } as UserProfile;
};

// --- Thunks ---

export const regenerateStats = createAsyncThunk(
    'user/regenerateStats',
    async (_, { getState, dispatch }) => {
        const state = getState() as RootState;
        const user = state.user.currentUser;
        if (!user || !user.email) return;

        let newHp = user.currentHp;
        let newDailyCompletions = user.dailyCompletionsCount;
        let updated = false;

        // Regenerate MP (Max 10). MP = 10 - dailyCompletionsCount.
        if (user.dailyCompletionsCount > 0) {
            newDailyCompletions = Math.max(0, user.dailyCompletionsCount - 1);
            updated = true;
        }
        
        // Regenerate HP (Max 100)
        if (user.currentHp < 100) {
            newHp = Math.min(100, user.currentHp + 1);
            updated = true;
        }

        if (updated) {
            try {
                api.updateProgress(user.email, { 
                    currentHp: newHp, 
                    dailyCompletionsCount: newDailyCompletions
                }).catch(console.warn);
            } catch (e) {
                console.warn("Regen sync failed");
            }
            return { newHp, newDailyCompletions };
        }
        return null;
    }
);

export const initAuth = createAsyncThunk('user/initAuth', async (_, { dispatch }) => {
    const email = localStorage.getItem(STORAGE_KEY_EMAIL);
    if (!email) return null;

    try {
        const response = await api.getAllUserData(email);
        if (!response.success) {
            return null;
        }

        const normalizedUser = mapSheetToUser(response);
        const loginRes = await api.dailyLogin(email);
        
        let reward: DailyRewardData | null = null;
        
        if (loginRes.success) {
            normalizedUser.streakDays = loginRes.streakDays;
            if (loginRes.progress && loginRes.progress.currentHp !== undefined) {
                normalizedUser.currentHp = loginRes.progress.currentHp;
            }

            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            
            // Reset daily completions if new day
            if (normalizedUser.lastLoginDate !== todayStr) {
                normalizedUser.dailyCompletionsCount = 0;
            }

            if (!loginRes.alreadyLoggedIn) {
                normalizedUser.lastLoginDate = todayStr;

                const bonusMultiplier = 1 + (normalizedUser.streakDays * 0.1);
                const coinsEarned = Math.floor(50 * bonusMultiplier);
                const xpEarned = Math.floor(100 * bonusMultiplier);
                
                // --- CALENDAR REWARD LOGIC ---
                const calendarReward = CALENDAR_CONFIG.find(c => c.day === normalizedUser.streakDays);
                if (calendarReward) {
                     if (calendarReward.item) {
                         // Grant item
                         if (!normalizedUser.inventory.includes(calendarReward.item)) {
                             normalizedUser.inventory.push(calendarReward.item);
                             api.addPurchase(normalizedUser.email, { id: calendarReward.item, name: 'Calendar Reward', cost: 0 }).catch(console.warn);
                             toast.success(`🎁 Получена награда календаря!`);
                         }
                     }
                }

                reward = { coins: coinsEarned, xp: xpEarned, streak: normalizedUser.streakDays, bonusMultiplier };
                dispatch(addExperience({ xp: xpEarned, coins: coinsEarned }));
            }
        }
        return { user: normalizedUser, reward };
    } catch (e) {
        console.error("Auth Init Failed:", e);
        return null;
    }
});

export const loginDemo = createAsyncThunk('user/loginDemo', async (_, { dispatch }) => {
    const demoEmail = 'demo@motivaquest.local';
    const demoPass = 'demo123';
    const demoUsername = "Demo Hero";

    const demoUserStruct = {
        ...DEFAULT_USER_DATA,
        email: demoEmail,
        username: demoUsername,
        uid: 'demo_hero_id',
        role: 'student',
        grade: 10,
        heroClass: 'warrior',
        className: 'Warrior',
        classEmoji: '⚔️',
        lastLoginDate: new Date().toDateString(),
        hasParentalConsent: true,
        currentHp: 100,
        coins: 0,
        level: 1
    } as UserProfile;

    try {
        const response = await api.login(demoEmail, demoPass);
        const normalizedUser = mapSheetToUser(response);
        normalizedUser.role = 'student';
        normalizedUser.uid = 'demo_hero_id';
        localStorage.setItem(STORAGE_KEY_EMAIL, normalizedUser.email);
        return { user: normalizedUser, reward: null };
    } catch (e: any) {
        console.warn("Demo user login failed. Registering...");
        try { await api.register(demoEmail, demoPass, demoUsername, 10, "Warrior", "⚔️"); } catch (regError) {}
        localStorage.setItem(STORAGE_KEY_EMAIL, demoUserStruct.email);
        return { user: demoUserStruct, reward: null };
    }
});

export const loginLocal = createAsyncThunk(
  'user/login',
  async (payload: { email: string; password: string }, { dispatch }) => {
    const response = await api.login(payload.email, payload.password);
    const normalizedUser = mapSheetToUser(response);
    // v3: роль приходит от сервера
    if (response.user?.role) {
        normalizedUser.role = response.user.role;
    }
    
    localStorage.setItem(STORAGE_KEY_EMAIL, normalizedUser.email);
    
    const loginRes = await api.dailyLogin(normalizedUser.email);
    let reward = null;

    if (loginRes.success) {
        normalizedUser.streakDays = loginRes.streakDays;
        
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        // Reset daily completions if new day
        if (normalizedUser.lastLoginDate !== todayStr) {
            normalizedUser.dailyCompletionsCount = 0;
        }

        if (!loginRes.alreadyLoggedIn) {
             normalizedUser.lastLoginDate = todayStr;

             const bonusMultiplier = 1 + (normalizedUser.streakDays * 0.1);
             const coinsEarned = Math.floor(50 * bonusMultiplier);
             const xpEarned = Math.floor(100 * bonusMultiplier);

             // --- CALENDAR REWARD LOGIC ---
             const calendarReward = CALENDAR_CONFIG.find(c => c.day === normalizedUser.streakDays);
             if (calendarReward) {
                  if (calendarReward.item) {
                      // Grant item
                      if (!normalizedUser.inventory.includes(calendarReward.item)) {
                          normalizedUser.inventory.push(calendarReward.item);
                          api.addPurchase(normalizedUser.email, { id: calendarReward.item, name: 'Calendar Reward', cost: 0 }).catch(console.warn);
                          toast.success(`🎁 Получена награда календаря!`);
                      }
                  }
             }

             reward = { coins: coinsEarned, xp: xpEarned, streak: normalizedUser.streakDays, bonusMultiplier };
             dispatch(addExperience({ xp: reward.xp, coins: reward.coins }));
        }
    }

    return { user: normalizedUser, reward };
  }
);

export const registerLocal = createAsyncThunk(
  'user/register',
  async (payload: { email: string; password: string; username: string; hasConsent: boolean, grade?: number }) => {
    await api.register(payload.email, payload.password, payload.username, payload.grade || 7);
    const newUserState: UserProfile = {
        ...DEFAULT_USER_DATA,
        email: payload.email.toLowerCase().trim(),
        username: payload.username,
        grade: payload.grade || 7,
        hasParentalConsent: payload.hasConsent,
        lastLoginDate: new Date().toDateString()
    } as UserProfile;
    localStorage.setItem(STORAGE_KEY_EMAIL, newUserState.email);
    analytics.track('register', newUserState, { email: payload.email });
    return { user: newUserState, reward: null };
  }
);

export const logoutLocal = createAsyncThunk('user/logout', async () => {
    localStorage.removeItem(STORAGE_KEY_EMAIL);
    
    // Clear quest progress to prevent data leak
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('quest_progress_') || key.startsWith('quest_hints_')) {
            localStorage.removeItem(key);
        }
    });

    api.logout(); // v3: очищаем токен сессии
    return null;
});

export const updateUserProfile = createAsyncThunk(
  'user/update',
  async (updates: Partial<UserProfile>, { getState }) => {
    const state = getState() as RootState;
    const currentUser = state.user.currentUser;
    if (!currentUser || !currentUser.email) throw new Error("No user");
    try {
        await api.updateProfile({
            email: currentUser.email,
            username: updates.username,
            grade: updates.grade,
            className: updates.className || (updates.heroClass ? updates.heroClass.toUpperCase() : undefined),
            classEmoji: updates.classEmoji,
            currentLocation: updates.currentLocation,
            selectedTheme: updates.themeColor,
            tutorialCompleted: updates.tutorialCompleted
        });
        
        // If lastCampaignAdvanceDate is updated, we might want to sync it specifically via updateInfo if updateProfile doesn't handle it
        if (updates.lastCampaignAdvanceDate) {
            api.updateInfo(currentUser.email, { lastCampaignAdvanceDate: updates.lastCampaignAdvanceDate }).catch(console.warn);
        }

    } catch(e) { handleApiError(e); }
    return updates;
  }
);

export const changeHeroClass = createAsyncThunk(
    'user/changeHeroClass',
    async (heroClass: HeroClass, { getState, dispatch }) => {
        const state = getState() as RootState;
        const user = state.user.currentUser;
        if (!user || !user.email) throw new Error("No user");

        const cost = user.heroClass ? 500 : 0;
        if (user.coins < cost) {
            toast.error(`Не хватает золота! Нужно ${cost} 💰`);
            throw new Error("Insufficient funds");
        }

        if (cost > 0) audio.playCoins(); 
        const newCoins = user.coins - cost;
        await dispatch(updateUserProfile({ 
            heroClass, 
            className: heroClass.charAt(0).toUpperCase() + heroClass.slice(1),
            coins: newCoins 
        }));
        api.updateProgress(user.email, { coins: newCoins }).catch(console.warn);
        toast.success(`Класс выбран: ${heroClass.toUpperCase()}!`);
        return { heroClass, coins: newCoins };
    }
);

export const purchaseItemAction = createAsyncThunk(
    'user/purchaseItem',
    async (item: { id: string, name: string, cost: number, type?: string }, { getState, rejectWithValue }) => {
        const state = getState() as RootState;
        const user = state.user.currentUser;
        if (!user || !user.email) return rejectWithValue("No user");

        if (user.coins < item.cost) {
            toast.error("Не хватает золота!");
            return rejectWithValue("Insufficient funds");
        }

        if (item.type === 'skin' && user.inventory?.includes(item.id)) {
            toast.warn('Этот облик уже у тебя!');
            return rejectWithValue('Already owned');
        }

        try {
            audio.playCoins();
            await api.addPurchase(user.email, item);
            return item;
        } catch (e: any) {
            handleApiError(e);
            return rejectWithValue(e.message);
        }
    },
    {
        condition: (_, { getState }) => {
            const state = getState() as RootState;
            if (state.user.pendingActions.purchase) {
                return false;
            }
        }
    }
);

export const equipSkinAction = createAsyncThunk(
    'user/equipSkin',
    async (avatarId: string, { getState, rejectWithValue }) => {
        const state = getState() as RootState;
        const user = state.user.currentUser;
        if (!user || !user.email) return rejectWithValue("No user");
        
        try {
            await api.updateProgress(user.email, { avatar: avatarId });
            return avatarId;
        } catch (e: any) {
            handleApiError(e);
            return rejectWithValue(e.message);
        }
    },
    {
        condition: (_, { getState }) => {
            const state = getState() as RootState;
            return !state.user.pendingActions.equipSkin;
        }
    }
);

export const submitDailyMood = createAsyncThunk(
    'user/submitMood',
    async (payload: { motivationScore: number, stressScore: number, enjoymentScore: number, id: string, date: string }, { getState, dispatch }) => {
        const state = getState() as RootState;
        const user = state.user.currentUser;
        if (!user || !user.email) return;

        try {
            await api.setMood(user.email, payload.motivationScore);
            await api.setDailyReport(user.email, {
                date: payload.date,
                score: payload.motivationScore
            });
            // Persist local timestamp to prevent reset on reload
            const userEmail = user.email.toLowerCase().trim();
            localStorage.setItem(`motiva_mood_ts_${userEmail}`, payload.date);
        } catch(e) { handleApiError(e); }
        
        await dispatch(addExperience({ xp: 30, coins: 15 }));
        return { ...payload, date: new Date().toISOString() };
    },
    {
        condition: (_, { getState }) => {
            const state = getState() as RootState;
            if (state.user.pendingActions.setMood) {
                return false;
            }
        }
    }
);

export const startQuestAction = createAsyncThunk(
    'user/startQuest',
    async (questId: number, { getState }) => {
        const state = getState() as RootState;
        const user = state.user.currentUser;
        if (!user || !user.email) return;
        const activeCount = Object.keys(user.activeQuestTimers || {}).length;
        if (activeCount >= 3) {
            throw new Error("Слишком много активных миссий! Сдай текущие.");
        }
        const timers = { ...user.activeQuestTimers, [questId]: Date.now() };
        return { activeQuestTimers: timers };
    }
);

export const addExperience = createAsyncThunk(
  'user/addExperience',
  async (payload: { xp: number; coins: number }, { getState, dispatch }) => {
    const state = getState() as RootState;
    const user = state.user.currentUser;
    if (!user || !user.email) return null;

    let newXp = (user.currentXp || 0) + payload.xp;
    let currentLevel = user.level || 1;
    let nextLevelXp = user.nextLevelXp || 100 * Math.pow(1.5, currentLevel - 1);
    let newCoins = (user.coins || 0) + payload.coins;
    let newTotalCoins = (user.totalCoinsEarned || 0) + payload.coins;

    let didLevelUp = false;
    while (newXp >= nextLevelXp) {
      newXp -= nextLevelXp;
      currentLevel++;
      nextLevelXp = Math.floor(100 * Math.pow(1.5, currentLevel - 1));
      didLevelUp = true;
    }

    if (didLevelUp) analytics.track('level_up', user, { oldLevel: user.level, newLevel: currentLevel });
    const updates = { 
        currentXp: newXp, 
        level: currentLevel, 
        nextLevelXp, 
        coins: newCoins,
        totalCoinsEarned: newTotalCoins 
    };
    
    api.updateProgress(user.email, updates).catch(console.warn);
    
    return { ...updates, rewardDelta: payload, didLevelUp };
  }
);

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
                case 'coins': if ((user.totalCoinsEarned || user.coins) >= ach.threshold) unlocked = true; break;
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

export const importSaveData = createAsyncThunk('user/import', async (json: string) => {
    const data = JSON.parse(json);
    if (data.email) {
        await api.updateProgress(data.email, data);
        localStorage.setItem(STORAGE_KEY_EMAIL, data.email);
        return data;
    }
    throw new Error("Invalid save file: missing email");
});

// --- CAMPAIGN THUNKS (Moved from campaignSlice to break circular dependency) ---

export const updateCampaignAction = createAsyncThunk(
    'campaign/updateCampaignAction',
    async (payload: { campaignId: string, currentDay: number, completedDays: number[] }, { getState }) => {
        const state = getState() as RootState;
        const user = state.user.currentUser;
        if (!user || !user.email) return;
        try {
            await api.updateCampaign(user.email, payload.campaignId, payload.currentDay, payload.completedDays);
        } catch (e) { handleApiError(e); }
    }
);

export const advanceCampaignDay = createAsyncThunk(
    'campaign/advanceCampaign',
    async (_, { getState, dispatch }) => {
        const state = getState() as RootState;
        const user = state.user.currentUser;
        if (!user || !user.email || !user.campaign.isDayComplete) return;

        // Prevent advancing past the final day (loop exploit fix)
        if (user.campaign.currentDay >= 14) {
            return;
        }

        const nextDay = user.campaign.currentDay + 1;
        const newAllies = [...user.campaign.unlockedAllies];
        
        let allyUnlocked = null;
        if (nextDay === 3) allyUnlocked = 'fairy';
        if (nextDay === 7) allyUnlocked = 'warrior';
        
        if (allyUnlocked && !newAllies.includes(allyUnlocked)) {
            newAllies.push(allyUnlocked);
            api.unlockAlly(user.email, allyUnlocked).catch(console.warn);
        }

        await dispatch(addExperience({ xp: 100, coins: 50 }));

        const updates = {
            campaign: {
                currentDay: nextDay > 14 ? 14 : nextDay, 
                isDayComplete: false,
                unlockedAllies: newAllies
            },
            lastCampaignAdvanceDate: new Date().toISOString() // LOCK the day
        };

        await dispatch(updateUserProfile(updates));
        // Sync Campaign
        await dispatch(updateCampaignAction({ 
            campaignId: 'main', 
            currentDay: nextDay > 14 ? 14 : nextDay, 
            completedDays: [] 
        }));

        toast.info("День завершен! Сюжет продолжается...", { icon: () => "📜" });
        return updates;
    }
);

export const finishCampaign = createAsyncThunk(
    'campaign/finishCampaign',
    async (_, { getState, dispatch }) => {
        const state = getState() as RootState;
        const user = state.user.currentUser;
        if (!user || !user.email) return;

        await dispatch(addExperience({ xp: 5000, coins: 2000 }));
        
        try {
            await api.addAchievement(user.email, { id: 'legend_of_productivity', title: 'Legend of Productivity' });
        } catch (e) { handleApiError(e); }
        
        const updates = {
            achievements: [...user.achievements, 'legend_of_productivity'],
            campaign: { ...user.campaign, isDayComplete: true }
        };
        
        return updates;
    }
);

export const completeBossBattleAction = createAsyncThunk(
    'campaign/completeBossBattle',
    async (payload: BossBattlePayload, { getState, dispatch }) => {
        const state = getState() as RootState;
        const user = state.user.currentUser;
        if (!user || !user.email) return;

        // Optimistic
        if (payload.won) {
            await dispatch(addExperience({ xp: payload.xpEarned, coins: payload.coinsEarned }));
        }

        try {
            await api.completeBossBattle(payload);
        } catch (e) { handleApiError(e); }
    }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action) => { state.currentUser = action.payload; },
    clearUser: (state) => { state.currentUser = null; },
    closeDailyRewardModal: (state) => { state.dailyRewardPopup = null; },
    popRewardAnimation: (state) => { state.pendingRewardAnimations.shift(); },
    submitSurvey: (state, action: PayloadAction<SurveySubmission>) => { },
    setThemeColor: (state, action: PayloadAction<ThemeColor>) => {
       if (state.currentUser && state.currentUser.email) {
         state.currentUser.themeColor = action.payload;
         api.updateProfile({ email: state.currentUser.email, selectedTheme: action.payload }).catch(console.warn);
       }
    },
    setPendingSyncCount: (state, action: PayloadAction<number>) => {
        state.pendingSyncCount = action.payload;
    },
    adminSetDay: (state, action: PayloadAction<number>) => {
        if (state.currentUser && state.currentUser.campaign) {
            state.currentUser.campaign.currentDay = action.payload;
            state.currentUser.campaign.isDayComplete = false;
        }
    },
    adminCompleteDay: (state) => {
        if (state.currentUser && state.currentUser.campaign) {
            state.currentUser.campaign.isDayComplete = true;
        }
    },
    adminResetCampaign: (state) => {
        if (state.currentUser) {
            state.currentUser.campaign = { currentDay: 1, isDayComplete: false, unlockedAllies: [] };
            state.currentUser.completedQuests = 0;
            state.currentUser.questHistory = [];
            state.currentUser.lastCampaignAdvanceDate = undefined;
        }
    },
    setGradeGroup: (state, action: PayloadAction<string>) => {
        state.gradeGroup = action.payload;
        const gradeMap: Record<string, number> = {
            grade5: 5, grade67: 6, grade89: 8, grade1011: 10
        };
        const email = state.currentUser?.email;
        if (email) {
            localStorage.setItem(`motiva_grade_group_${email.toLowerCase().trim()}`, action.payload);
        }
        if (state.currentUser) {
            state.currentUser.grade = gradeMap[action.payload] || 7;
        }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(initAuth.pending, (state) => { state.pendingActions.auth = true; })
      .addCase(initAuth.fulfilled, (state, action) => {
        state.pendingActions.auth = false;
        if (action.payload) {
            state.currentUser = action.payload.user;
            state.dailyRewardPopup = action.payload.reward;
            const email = action.payload.user.email?.toLowerCase().trim();
            if (email) {
                state.gradeGroup = localStorage.getItem(`motiva_grade_group_${email}`) || null;
            }
        }
        state.loading = false;
        state.nextRegenTime = Date.now() + 60 * 1000; // Reset regen timer (1 min)
      })
      .addCase(initAuth.rejected, (state) => { state.pendingActions.auth = false; })
      
      // Login/Register
      .addCase(registerLocal.fulfilled, (state, action) => { 
          state.currentUser = action.payload.user;
          state.dailyRewardPopup = action.payload.reward;
          state.gradeGroup = null; // новый пользователь — покажем выбор класса
          state.nextRegenTime = Date.now() + 60 * 1000;
      })
      .addCase(loginLocal.fulfilled, (state, action) => { 
          state.currentUser = action.payload.user; 
          state.dailyRewardPopup = action.payload.reward;
          const email = action.payload.user.email?.toLowerCase().trim();
          if (email) {
              state.gradeGroup = localStorage.getItem(`motiva_grade_group_${email}`) || null;
          }
          state.nextRegenTime = Date.now() + 60 * 1000;
      })
      .addCase(loginDemo.fulfilled, (state, action) => { 
          state.currentUser = action.payload.user;
          state.dailyRewardPopup = action.payload.reward;
          const email = action.payload.user.email?.toLowerCase().trim();
          if (email) {
              state.gradeGroup = localStorage.getItem(`motiva_grade_group_${email}`) || null;
          }
          state.nextRegenTime = Date.now() + 60 * 1000;
      })
      .addCase(logoutLocal.fulfilled, (state) => { state.currentUser = null; state.gradeGroup = null; })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        if (state.currentUser) state.currentUser = { ...state.currentUser, ...action.payload };
      })
      .addCase(equipSkinAction.pending, (state) => { state.pendingActions.equipSkin = true; })
      .addCase(equipSkinAction.fulfilled, (state, action) => {
          state.pendingActions.equipSkin = false;
          if (state.currentUser) state.currentUser.avatar = action.payload;
      })
      .addCase(equipSkinAction.rejected, (state) => { state.pendingActions.equipSkin = false; })
      
      .addCase(regenerateStats.fulfilled, (state, action) => {
          if (state.currentUser && action.payload) {
              state.currentUser.currentHp = action.payload.newHp;
              state.currentUser.dailyCompletionsCount = action.payload.newDailyCompletions;
          }
          state.nextRegenTime = Date.now() + 60 * 1000; // Reset timer (1 min)
      })
      .addCase(regenerateStats.rejected, (state) => {
          // If regen fails (e.g. rate limit), still push the timer forward to prevent infinite loop
          state.nextRegenTime = Date.now() + 60 * 1000;
      })

      .addCase(addExperience.fulfilled, (state, action) => {
         if (state.currentUser && action.payload) {
             state.currentUser = { ...state.currentUser, ...action.payload as any };
             const { xp, coins } = action.payload.rewardDelta;
             if (xp > 0 || coins > 0) {
                 state.pendingRewardAnimations.push({ 
                     id: Date.now().toString(), xp, coins 
                 });
             }
         }
      })
      .addCase(startQuestAction.fulfilled, (state, action) => {
          if (state.currentUser && action.payload) {
              state.currentUser = { ...state.currentUser, ...action.payload };
          }
      })
      .addCase(purchaseItemAction.pending, (state) => { state.pendingActions.purchase = true; })
      .addCase(purchaseItemAction.fulfilled, (state, action) => {
          state.pendingActions.purchase = false;
          if (state.currentUser && action.payload) {
              state.currentUser.coins -= action.payload.cost;
              if (!state.currentUser.inventory) state.currentUser.inventory = [];
              state.currentUser.inventory.push(action.payload.id);
          }
      })
      .addCase(purchaseItemAction.rejected, (state) => { state.pendingActions.purchase = false; })

      .addCase(submitDailyMood.pending, (state) => { state.pendingActions.setMood = true; })
      .addCase(submitDailyMood.fulfilled, (state, action) => {
          state.pendingActions.setMood = false;
          if (state.currentUser && action.payload) {
              state.currentUser.lastDailyMood = action.payload.date;
              if(!state.currentUser.surveyHistory) state.currentUser.surveyHistory = [];
              state.currentUser.surveyHistory.push({
                  id: action.payload.id,
                  date: action.payload.date,
                  motivationScore: action.payload.motivationScore,
                  stressScore: 0,
                  enjoymentScore: 0
              });
          }
      })
      .addCase(submitDailyMood.rejected, (state) => { state.pendingActions.setMood = false; })

      .addCase(importSaveData.fulfilled, (state, action) => {
          state.currentUser = action.payload;
      })

      // === Cross-Slice Listeners ===
      
      // 1. Quests Slice Listener
      .addCase(completeQuestAction.pending, (state) => { state.pendingActions.completeQuest = true; })
      .addCase(completeQuestAction.fulfilled, (state, action) => {
          state.pendingActions.completeQuest = false;
          if (!state.currentUser || !action.payload) return;

          const { quest, historyItem, xpReward, coinsReward, hpLost } = action.payload;

          // Update lists
          state.currentUser.completedQuests = (state.currentUser.completedQuests || 0) + 1;
          state.currentUser.questHistory = [...(state.currentUser.questHistory || []), historyItem];
          
          const newTimers = { ...state.currentUser.activeQuestTimers };
          delete newTimers[quest.id];
          state.currentUser.activeQuestTimers = newTimers;
          
          state.currentUser.dailyCompletionsCount = (state.currentUser.dailyCompletionsCount || 0) + 1;
          state.currentUser.currentHp = Math.max(0, state.currentUser.currentHp - hpLost);

          // IMPORTANT: Update local streaks immediately for UI
          if (quest.isHabit) {
              const currentStreak = (state.currentUser.habitStreaks?.[quest.id] || 0) + 1;
              state.currentUser.habitStreaks = { 
                  ...(state.currentUser.habitStreaks || {}), 
                  [quest.id]: currentStreak 
              };
              // Persist streaks to backend is handled in completeQuestAction thunk
          }
          
          // Check campaign progression via quests (2/3 Rule)
          if (state.currentUser.campaign) {
            const currentStoryDay = CAMPAIGN_DATA.find(d => d.day === state.currentUser!.campaign.currentDay);
            if (currentStoryDay) {
                const requiredIds = currentStoryDay.questIds;
                const completedIds = new Set(state.currentUser.questHistory.map(h => h.questId));
                
                // Count how many required quests are done
                const completedCount = requiredIds.filter(id => completedIds.has(id)).length;
                const threshold = Math.ceil(requiredIds.length * (2/3)); // 2/3 Rule

                if (completedCount >= threshold && !state.currentUser.campaign.isDayComplete) {
                    state.currentUser.campaign.isDayComplete = true;
                }
            }
          }
          
          // Re-adding XP logic here since we moved the thunk
          let newXp = (state.currentUser.currentXp || 0) + xpReward;
          let currentLevel = state.currentUser.level || 1;
          let nextLevelXp = state.currentUser.nextLevelXp || 100 * Math.pow(1.5, currentLevel - 1);
          let newCoins = (state.currentUser.coins || 0) + coinsReward;
          
          while (newXp >= nextLevelXp) {
              newXp -= nextLevelXp;
              currentLevel++;
              nextLevelXp = Math.floor(100 * Math.pow(1.5, currentLevel - 1));
          }

          state.currentUser.currentXp = newXp;
          state.currentUser.level = currentLevel;
          state.currentUser.nextLevelXp = nextLevelXp;
          state.currentUser.coins = newCoins;
      })
      .addCase(completeQuestAction.rejected, (state) => { state.pendingActions.completeQuest = false; })

      // 2. Campaign Slice Listener
      .addCase(advanceCampaignDay.fulfilled, (state, action) => {
          if (state.currentUser && action.payload) {
              state.currentUser = { ...state.currentUser, ...action.payload };
          }
      })
      .addCase(finishCampaign.fulfilled, (state, action) => {
          if (state.currentUser && action.payload) {
              state.currentUser = { ...state.currentUser, ...action.payload as any };
          }
      })
      .addCase(completeBossBattleAction.pending, (state) => { state.pendingActions.bossBattle = true; })
      .addCase(completeBossBattleAction.fulfilled, (state) => { state.pendingActions.bossBattle = false; })
      .addCase(completeBossBattleAction.rejected, (state) => { state.pendingActions.bossBattle = false; })

      // 3. Achievements Slice Listener
      .addCase(checkAchievements.fulfilled, (state, action) => {
          if (state.currentUser && action.payload) {
              state.currentUser = { ...state.currentUser, ...action.payload as any };
          }
      })
      
      // 4. Guild Slice Listener
      .addCase(guildDonate.fulfilled, (state, action) => {
          if (state.currentUser && action.payload.newBalance !== undefined) {
              state.currentUser.coins = action.payload.newBalance;
          }
      })
      .addCase(createGuild.fulfilled, (state, action) => {
          if (state.currentUser) {
              state.currentUser.coins = Math.max(0, state.currentUser.coins - 100);
              state.currentUser.guildId = action.payload.guildId;
              state.currentUser.guildName = action.meta.arg.name;
              state.currentUser.guildRole = 'leader';
          }
      })
      .addCase(joinGuild.fulfilled, (state, action) => {
          if (state.currentUser) {
              state.currentUser.guildId = action.meta.arg.guildId;
              state.currentUser.guildRole = 'member';
              // We don't have the name yet, but we can try to fetch it or wait for fetchMyGuild
              // Ideally, joinGuild should return the guild name, but for now we rely on fetchMyGuild
          }
      })
      .addCase(createGuild.rejected, (state) => {
          // Revert optimistic update if needed, or just set status
          state.status = 'failed';
      })
      .addCase(leaveGuild.fulfilled, (state) => {
          if (state.currentUser) {
              state.currentUser.guildId = undefined;
              state.currentUser.guildName = undefined;
              state.currentUser.guildRole = undefined;
          }
      })
      .addCase(contributeGuildQuest.fulfilled, (state, action) => {
          // Optional: Update user stats if contribution gives rewards directly
      })
      .addCase(fetchMyGuild.fulfilled, (state, action) => {
          if (state.currentUser && !action.payload) {
              state.currentUser.guildId = undefined;
              state.currentUser.guildName = undefined;
              state.currentUser.guildRole = undefined;
          }
      });
  }
});

export const selectIsPending = (key: keyof PendingActions) => (state: RootState) => state.user.pendingActions[key];

export const { 
    setUser, clearUser, submitSurvey, setThemeColor, 
    adminSetDay, adminCompleteDay, adminResetCampaign, closeDailyRewardModal,
    popRewardAnimation, setPendingSyncCount, setGradeGroup
} = userSlice.actions;
export default userSlice.reducer;