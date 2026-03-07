import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { UserProfile, SurveySubmission, ThemeColor, QuestHistoryItem, HeroClass, GradeGroup } from '../types';
import { toast } from 'react-toastify';
import { RootState } from './index';
import { analytics } from '../services/analytics';
import { api, BossBattlePayload, getCachedResponse, ping } from '../services/api';
import { audio } from '../services/audio';
import { handleApiError } from '../utils/errorHandler';
import { CAMPAIGN_DATA } from '../data/campaignData';
import { CALENDAR_CONFIG } from './rewardsSlice';

// Import actions from other slices for extraReducers
import { completeQuestAction } from './actions';
import { createGuild, guildDonate, leaveGuild, joinGuild, fetchMyGuild, contributeGuildQuest } from './guildSlice';
import { calculateNextLevelXp, applyXpGain } from '../utils/levelUtils';
import { gradeToGroup } from '../data/questTypes';

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
  nextRegenTime: 0, // Initialize to 0, set on load
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
    const guildData = rawData.guild || null;

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

    // Re-verify campaign completion on load (100% rule)
    const currentStoryDay = CAMPAIGN_DATA.find(d => d.day === campaignData.currentDay);
    if (currentStoryDay) {
        const gradeGroup = gradeToGroup(Number(user.grade) || 7);
        const requiredIds = Array.isArray(currentStoryDay.questIds) 
            ? currentStoryDay.questIds 
            : (currentStoryDay.questIds[gradeGroup] || currentStoryDay.questIds['grade67'] || []);
            
        const completedIds = new Set(mappedHistory.map(h => h.questId));
        // Count how many required quests are done (using loose string comparison)
        const completedCount = requiredIds.filter(id => completedIds.has(String(id)) || completedIds.has(Number(id))).length;
        
        // 100% Rule: All quests must be completed
        if (completedCount >= requiredIds.length && requiredIds.length > 0) {
            campaignData.isDayComplete = true;
        }
    }

    // Normalize lastLoginDate to ISO
    let normalizedLoginDate: string | undefined = progress.lastLoginDate;
    if (normalizedLoginDate) {
        const parsed = new Date(normalizedLoginDate);
        if (!isNaN(parsed.getTime())) {
            normalizedLoginDate = parsed.toISOString().split('T')[0];
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
        lastLoginDate: normalizedLoginDate,
        totalQuestsCompleted: Number(progress.totalQuestsCompleted) || 0,
        weeklyXp: Number(progress.weeklyXp) || 0,
        weeklyXpResetDate: progress.weeklyXpResetDate,
        tutorialCompleted: progress.tutorialCompleted === true || progress.tutorialCompleted === 'true',
        
        avatar: progress.avatar || progress.visitorAvatar || info.avatar || 'warrior',
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
        guildId: guildData?.guildId || undefined,
        guildName: guildData?.name || undefined,
        guildRole: guildData?.myRole || undefined,
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

// 1. Unify date format
const getTodayISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
};

function cleanupStaleQuestCache() {
    const TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
    const now = Date.now();
    
    const keysToCheck: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('quest_progress_') || key.startsWith('quest_hints_'))) {
            keysToCheck.push(key);
        }
    }
    
    keysToCheck.forEach(key => {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            // If timestamp exists and older than TTL - remove
            if (parsed._timestamp && (now - parsed._timestamp) > TTL) {
                localStorage.removeItem(key);
            }
            // If no timestamp (old format) and too many keys - remove
            if (!parsed._timestamp && keysToCheck.length > 100) {
                localStorage.removeItem(key);
            }
        } catch {
            localStorage.removeItem(key); // Corrupted data
        }
    });
}

// --- HELPER: Process Daily Login Logic ---
const processDailyLogin = (user: UserProfile, loginRes: any): DailyRewardData | null => {
    if (!loginRes || !loginRes.success) return null;

    const todayStr = getTodayISO();
    
    // ⬇️ LOCAL PROTECTION: Check if already claimed today locally
    const localClaimed = localStorage.getItem('motiva_daily_claimed_date');
    if (localClaimed === todayStr) {
        // Already claimed today locally - do not show again
        user.lastLoginDate = todayStr;
        return null;
    }

    // Update streak and HP from server response
    user.streakDays = loginRes.streakDays;
    if (loginRes.progress && loginRes.progress.currentHp !== undefined) {
        user.currentHp = loginRes.progress.currentHp;
    }

    // Reset daily completions if new day OR if we just claimed a daily reward (meaning it's a new day)
    if (user.lastLoginDate !== todayStr || !loginRes.alreadyLoggedIn) {
        user.dailyCompletionsCount = 0;
    }

    // If already logged in today on server, we don't give reward again
    if (loginRes.alreadyLoggedIn) {
        // Ensure local date is synced even if no reward
        if (user.lastLoginDate !== todayStr) {
             user.lastLoginDate = todayStr;
        }
        return null;
    }

    // --- GRANT REWARD ---
    user.lastLoginDate = todayStr;
    localStorage.setItem('motiva_last_login_date', todayStr);
    
    // ⬇️ MARK AS CLAIMED LOCALLY
    localStorage.setItem('motiva_daily_claimed_date', todayStr);

    const bonusMultiplier = Math.min(3, 1 + (user.streakDays * 0.1));
    const coinsEarned = Math.floor(50 * bonusMultiplier);
    const xpEarned = Math.floor(100 * bonusMultiplier);
    
    // --- CALENDAR REWARD LOGIC ---
    const calendarReward = CALENDAR_CONFIG.find(c => c.day === user.streakDays);
    if (calendarReward) {
            if (calendarReward.item) {
                // Grant item
                if (!user.inventory.includes(calendarReward.item)) {
                    user.inventory.push(calendarReward.item);
                    api.addPurchase(user.email, { id: calendarReward.item, name: 'Calendar Reward', cost: 0 }).catch(console.warn);
                    toast.success(`🎁 Получена награда календаря!`);
                }
            }
    }

    return { coins: coinsEarned, xp: xpEarned, streak: user.streakDays, bonusMultiplier };
};

export const setGradeGroup = createAsyncThunk(
    'user/setGradeGroup',
    async (gradeGroup: string, { getState }) => {
        const state = getState() as RootState;
        const user = state.user.currentUser;
        if (!user || !user.email) return null;

        const gradeMap: Record<string, number> = {
            grade5: 5, grade67: 6, grade89: 8, grade1011: 10
        };
        const newGrade = gradeMap[gradeGroup] || 7;

        // 1. Update Local Storage
        const email = user.email.toLowerCase().trim();
        localStorage.setItem(`motiva_grade_group_${email}`, gradeGroup);

        // 2. Sync with Server
        try {
            await api.updateProfile({ 
                email: user.email, 
                grade: newGrade 
            });
        } catch (e) {
            console.warn("Failed to sync grade with server", e);
        }

        return { gradeGroup, grade: newGrade };
    }
);

export const initAuth = createAsyncThunk('user/initAuth', async (_, { dispatch }) => {
    const email = localStorage.getItem(STORAGE_KEY_EMAIL);
    if (!email) return null;

    // ⬇️ Warm up GAS immediately
    ping();

    // 1. Optimistic UI: Show cache INSTANTLY while server responds
    const cached = getCachedResponse('getAllUserData', email);
    if (cached) {
        try {
            const cachedUser = mapSheetToUser(cached);
            dispatch({ type: 'user/setUser', payload: cachedUser });
            const gradeGroup = localStorage.getItem(`motiva_grade_group_${email}`) 
                || gradeToGroup(cachedUser.grade || 7);
            dispatch({ type: 'user/setGradeGroupImmediate', payload: gradeGroup });
        } catch (e) { console.warn("Cache parse failed", e); }
    }

    try {
        // v3.3: ONE request instead of two parallel
        // initSession = dailyLogin + getAllUserData combined on server
        const response = await api.initSession(email);

        if (!response.success) {
            return null;
        }

        const normalizedUser = mapSheetToUser(response);
        let reward: DailyRewardData | null = null;
        
        // v3.3: daily данные встроены в ответ
        const dailyData = response.daily;
        
        if (dailyData && !dailyData.alreadyLoggedIn) {
            const loginRes = {
                success: true,
                alreadyLoggedIn: dailyData.alreadyLoggedIn,
                streakDays: dailyData.streakDays,
                hpRestored: dailyData.hpRestored,
                progress: response.progress
            };
            
            reward = processDailyLogin(normalizedUser, loginRes);
            if (reward) {
                const { level, currentXp, nextLevelXp } = applyXpGain(
                    normalizedUser.currentXp, normalizedUser.level, reward.xp
                );
                normalizedUser.currentXp = currentXp;
                normalizedUser.level = level;
                normalizedUser.nextLevelXp = nextLevelXp;
                normalizedUser.coins += reward.coins;
                normalizedUser.totalCoinsEarned = (normalizedUser.totalCoinsEarned || 0) + reward.coins;
                
                api.updateProgress(normalizedUser.email, {
                    currentXp, level, coins: normalizedUser.coins, 
                    totalCoinsEarned: normalizedUser.totalCoinsEarned
                }).catch(console.warn);
            }
        } else {
            // Уже залогинен сегодня
            const todayStr = getTodayISO();
            if (normalizedUser.lastLoginDate !== todayStr) {
                normalizedUser.lastLoginDate = todayStr;
                normalizedUser.dailyCompletionsCount = 0;
            }
        }
        
        cleanupStaleQuestCache();
        return { user: normalizedUser, reward };
    } catch (e: any) {
        if (e.message === 'OFFLINE_SAVED') {
            console.log("Auth Init: Offline mode active. Request queued.");
            return null;
        }
        console.error("Auth Init Failed:", e);
        return null;
    }
});

export const loginLocal = createAsyncThunk(
  'user/login',
  async (payload: { email: string; password: string }, { dispatch }) => {
    // v3.3: Один запрос вместо трёх (login + dailyLogin + getAllUserData)
    const response = await api.loginFull(payload.email, payload.password);
    
    // mapSheetToUser работает как раньше — формат ответа тот же
    const normalizedUser = mapSheetToUser(response);
    if (response.user?.role) {
        normalizedUser.role = response.user.role;
    }
    
    localStorage.setItem(STORAGE_KEY_EMAIL, normalizedUser.email);
    
    // v3.3: daily данные уже встроены в ответ — не нужен отдельный запрос
    const dailyData = response.daily;
    const loginRes = {
        success: true,
        alreadyLoggedIn: dailyData.alreadyLoggedIn,
        streakDays: dailyData.streakDays,
        hpRestored: dailyData.hpRestored,
        progress: response.progress
    };

    const reward = processDailyLogin(normalizedUser, loginRes);
    if (reward) {
         const { level, currentXp, nextLevelXp } = applyXpGain(normalizedUser.currentXp, normalizedUser.level, reward.xp);
         normalizedUser.currentXp = currentXp;
         normalizedUser.level = level;
         normalizedUser.nextLevelXp = nextLevelXp;
         normalizedUser.coins += reward.coins;
         normalizedUser.totalCoinsEarned = (normalizedUser.totalCoinsEarned || 0) + reward.coins;
         
         // v3.3: Прогресс уже обновлён на сервере через dailyLogin,
         // но XP/coins от награды всё ещё нужно синхронизировать
         api.updateProgress(normalizedUser.email, {
             currentXp, level, coins: normalizedUser.coins, totalCoinsEarned: normalizedUser.totalCoinsEarned
         }).catch(console.warn);
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
        lastLoginDate: new Date().toISOString().split('T')[0]
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

// New thunk for theme change (pure reducer + side effect)
export const setThemeAction = createAsyncThunk(
    'user/setTheme',
    async (theme: ThemeColor, { dispatch, getState }) => {
        const state = getState() as RootState;
        const user = state.user.currentUser;
        if (!user || !user.email) return;

        // Optimistic update
        dispatch(setThemeColor(theme));

        try {
            await api.updateProfile({ email: user.email, selectedTheme: theme });
        } catch (e) {
            console.warn("Theme sync failed", e);
            // Optionally revert here if needed
        }
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
            await api.updateProgress(user.email, { 
                avatar: avatarId,
                visitorAvatar: avatarId 
            });
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

        // Prevent advancing past the final day
        const maxDay = CAMPAIGN_DATA.length;
        if (user.campaign.currentDay >= maxDay) {
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
                currentDay: nextDay > maxDay ? maxDay : nextDay, 
                isDayComplete: false,
                unlockedAllies: newAllies
            },
            lastCampaignAdvanceDate: new Date().toISOString() // LOCK the day
        };

        await dispatch(updateUserProfile(updates));
        // Sync Campaign
        await dispatch(updateCampaignAction({ 
            campaignId: 'main', 
            currentDay: nextDay > maxDay ? maxDay : nextDay, 
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
       if (state.currentUser) {
         state.currentUser.themeColor = action.payload;
       }
    },
    setPendingSyncCount: (state, action: PayloadAction<number>) => {
        state.pendingSyncCount = action.payload;
    },
    setGradeGroupImmediate: (state, action: PayloadAction<string | null>) => {
        state.gradeGroup = action.payload;
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
  },
  extraReducers: (builder) => {
    builder
      .addCase(setGradeGroup.fulfilled, (state, action) => {
          if (action.payload) {
              state.gradeGroup = action.payload.gradeGroup;
              if (state.currentUser) {
                  state.currentUser.grade = action.payload.grade;
              }
          }
      })
      .addCase(initAuth.pending, (state) => { state.pendingActions.auth = true; })
      .addCase(initAuth.fulfilled, (state, action) => {
        state.pendingActions.auth = false;
        if (action.payload) {
            state.currentUser = action.payload.user;
            state.dailyRewardPopup = action.payload.reward;
            const email = action.payload.user.email?.toLowerCase().trim();
            if (email) {
                state.gradeGroup = localStorage.getItem(`motiva_grade_group_${email}`) 
                    || gradeToGroup(action.payload.user.grade || 7);
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
              state.gradeGroup = localStorage.getItem(`motiva_grade_group_${email}`) 
                  || gradeToGroup(action.payload.user.grade || 7);
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
          if (state.currentUser) {
              state.currentUser.avatar = action.payload;
              // ⬇️ Cache locally for instant load
              localStorage.setItem('motiva_avatar_cache', action.payload);
          }
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
          if (!state.currentUser.questHistory) state.currentUser.questHistory = [];
          state.currentUser.questHistory.push(historyItem);
          
          if (state.currentUser.activeQuestTimers) {
              delete state.currentUser.activeQuestTimers[quest.id];
          }
          
          state.currentUser.dailyCompletionsCount = (state.currentUser.dailyCompletionsCount || 0) + 1;
          state.currentUser.currentHp = Math.max(0, state.currentUser.currentHp - hpLost);

          // IMPORTANT: Update local streaks immediately for UI
          if (quest.isHabit) {
              const qId = String(quest.id);
              const currentStreak = (state.currentUser.habitStreaks?.[qId] || 0) + 1;
              if (!state.currentUser.habitStreaks) state.currentUser.habitStreaks = {};
              state.currentUser.habitStreaks[qId] = currentStreak;
              // Persist streaks to backend is handled in completeQuestAction thunk
          }
          
          // Check campaign progression via quests (100% Rule)
          if (state.currentUser.campaign) {
            const currentStoryDay = CAMPAIGN_DATA.find(d => d.day === state.currentUser!.campaign.currentDay);
            if (currentStoryDay) {
                const gradeGroup = (state.gradeGroup || 'grade67') as GradeGroup;
                const requiredIds = Array.isArray(currentStoryDay.questIds) 
                    ? currentStoryDay.questIds 
                    : (currentStoryDay.questIds[gradeGroup] || currentStoryDay.questIds['grade67'] || []);

                const completedIds = new Set(state.currentUser.questHistory.map(h => h.questId));
                
                // Count how many required quests are done
                const completedCount = requiredIds.filter((id: string | number) => completedIds.has(String(id)) || completedIds.has(Number(id))).length;
                
                // 100% Rule
                if (completedCount >= requiredIds.length && requiredIds.length > 0 && !state.currentUser.campaign.isDayComplete) {
                    state.currentUser.campaign.isDayComplete = true;
                }
            }
          }
          
          // Use pre-calculated values from thunk
          if (action.payload.newLevel !== undefined) {
              state.currentUser.level = action.payload.newLevel;
              state.currentUser.currentXp = action.payload.newXp;
              state.currentUser.nextLevelXp = action.payload.newNextLevelXp;
          } else {
              // Fallback for safety
              const { level, currentXp, nextLevelXp } = applyXpGain(
                  state.currentUser.currentXp || 0,
                  state.currentUser.level || 1,
                  xpReward
              );
              state.currentUser.currentXp = currentXp;
              state.currentUser.level = level;
              state.currentUser.nextLevelXp = nextLevelXp;
          }
          
          state.currentUser.coins = (state.currentUser.coins || 0) + coinsReward;
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
              state.currentUser.coins = Math.max(0, state.currentUser.coins - 200);
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
          // state.status = 'failed'; // Removed as status doesn't exist on UserState
      })
      .addCase(leaveGuild.fulfilled, (state) => {
          if (state.currentUser) {
              state.currentUser.guildId = undefined;
              state.currentUser.guildName = undefined;
              state.currentUser.guildRole = undefined;
              state.currentUser.guildXPContributed = 0;
          }
      })
      .addCase(contributeGuildQuest.fulfilled, (state, action) => {
          // Optional: Update user stats if contribution gives rewards directly
      })
      .addCase(fetchMyGuild.fulfilled, (state, action) => {
          if (state.currentUser) {
              if (!action.payload) {
                  state.currentUser.guildId = undefined;
                  state.currentUser.guildName = undefined;
                  state.currentUser.guildRole = undefined;
              } else {
                  state.currentUser.guildId = action.payload.guildId;
                  state.currentUser.guildName = action.payload.name;
                  state.currentUser.guildRole = action.payload.myRole || undefined;
              }
          }
      });
  }
});

export const selectIsPending = (key: keyof PendingActions) => (state: RootState) => state.user.pendingActions[key];

export const { 
    setUser, clearUser, submitSurvey, setThemeColor, 
    adminSetDay, adminCompleteDay, adminResetCampaign, closeDailyRewardModal,
    popRewardAnimation, setPendingSyncCount
} = userSlice.actions;
export default userSlice.reducer;