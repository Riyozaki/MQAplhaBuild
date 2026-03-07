import { createAsyncThunk } from '@reduxjs/toolkit';
import { Quest, QuestRarity, QuestHistoryItem } from '../types';
import { api, CompleteQuestPayload } from '../services/api';
import { toast } from 'react-toastify';
import { handleApiError } from '../utils/errorHandler';
import { audio } from '../services/audio';
import { getTasksForQuest } from '../data';
import { rawQuests } from '../data/defaultQuests';
import { calculateNextLevelXp } from '../utils/levelUtils';

// Minimal interface to break circular dependency
interface StateWithUser {
    user: {
        currentUser: any; // Using any to avoid importing UserProfile which might be in types.ts (safe) but to be extra safe
        gradeGroup: string | null;
        pendingActions: {
            completeQuest: boolean;
        };
    }
}

// Helper to get min minutes (moved from questsSlice)
const getMinMinutes = (rarity: QuestRarity): number => {
    switch(rarity) {
        case 'Common': return 1; 
        case 'Rare': return 5;
        case 'Epic': return 15;
        case 'Legendary': return 30;
        default: return 1;
    }
};

// Map raw to full Quest object (moved from questsSlice)
const mapRawQuest = (q: any): Quest => {
    // Only specific IDs are treated as recurring Habits
    // 55: Зарядка, 65: Уборка, 69: Режим сна
    const HABIT_IDS = [55, 65, 69];
    const isHabit = HABIT_IDS.includes(Number(q.id));
    
    // Auto-assign difficulty based on rarity
    let difficulty = q.difficulty;
    if (!difficulty) {
        if (q.rarity === 'Common' || q.rarity === 'common') difficulty = 'Easy';
        else if (q.rarity === 'Rare' || q.rarity === 'rare') difficulty = 'Medium';
        else difficulty = 'Hard';
    }

    // Map legacy 'grades' to 'gradeRange'
    let gradeRange = q.gradeRange;
    if (q.grades) {
        gradeRange = q.grades;
    }

    // Capitalize rarity
    let rarity = q.rarity;
    if (rarity) {
        rarity = rarity.charAt(0).toUpperCase() + rarity.slice(1);
    }

    // Map rewards
    const xp = q.xp || q.xpReward || 10;
    const coins = q.coins || q.coinReward || 5;

    // Ensure tasks exist
    let tasks = q.tasks;
    if (!tasks) {
        tasks = getTasksForQuest(q.id);
    }
    
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        tasks = [{
            id: 1,
            type: 'yes_no',
            question: q.description || "Задание выполнено?",
            correctAnswer: "yes",
            xpBonus: 0
        }];
    }

    return {
        ...q,
        type: q.type || 'daily',
        isHabit, 
        completed: false,
        minMinutes: getMinMinutes(rarity as QuestRarity),
        difficulty,
        gradeRange,
        rarity: rarity as QuestRarity,
        xp,
        coins,
        tasks
    };
};

export const fetchQuests = createAsyncThunk('quests/fetchQuests', async (_, { getState }) => {
  const state = getState() as StateWithUser;
  const user = state.user.currentUser;
  const gradeGroup = state.user.gradeGroup;
  
  if (!user) return [];

  const userGrade = user.grade || 7; // Default grade
  let additionalQuests: any[] = [];

  // Dynamic Import
  try {
      if (gradeGroup === 'grade5') {
          const module = await import('../data/grade5Quests');
          additionalQuests = module.grade5Quests;
      } else if (gradeGroup === 'grade67') {
          const module = await import('../data/grade67Quests');
          additionalQuests = module.grade67Quests;
      } else if (gradeGroup === 'grade89') {
          const module = await import('../data/grade89Quests');
          additionalQuests = module.grade89Quests;
      } else if (gradeGroup === 'grade1011') {
          const module = await import('../data/grade1011Quests');
          additionalQuests = module.grade1011Quests;
      }
  } catch (e) {
      console.warn("Failed to load grade quests", e);
  }

  const allQuests = [
      ...rawQuests.map(mapRawQuest),
      ...additionalQuests.map(mapRawQuest)
  ];

  // Filter by grade
  const filteredQuests = allQuests.filter(q => {
      if (!q.gradeRange) return true; // No restriction
      return userGrade >= q.gradeRange[0] && userGrade <= q.gradeRange[1];
  });

  return filteredQuests.map(q => {
    let isCompleted = false;
    
    // Check completion
    if (user.questHistory) {
        const history = user.questHistory
            .filter((h: any) => String(h.questId) === String(q.id)) // FIX: String comparison
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        if (history.length > 0) {
            const lastCompletion = new Date(history[0].date);
            const now = new Date();

            if (q.type === 'story') {
                isCompleted = true;
            } else if (q.type === 'daily') {
                const diffMs = now.getTime() - lastCompletion.getTime();
                const hoursSinceCompletion = diffMs / (1000 * 60 * 60);
                if (hoursSinceCompletion < 24) isCompleted = true; 
            }
        }
    }

    return { ...q, completed: isCompleted };
  });
});

export const completeQuestAction = createAsyncThunk(
    'quests/completeQuestAction',
    async (payload: { quest: Quest, multiplier?: number, isAutoComplete?: boolean }, { getState, rejectWithValue }) => {
        const state = getState() as StateWithUser;
        const user = state.user.currentUser;
        if (!user || !user.email) return rejectWithValue("No user");
        
        const { quest, multiplier = 1, isAutoComplete = false } = payload;
        
        // ======= FIX: Duplicate completion guard =======
        if (user.questHistory && Array.isArray(user.questHistory)) {
            const questIdStr = String(quest.id);
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const alreadyDone = user.questHistory.some((h: any) => {
                if (String(h.questId) !== questIdStr) return false;
                
                if (quest.type === 'story') {
                    return true; // Story quests: one-time only
                }
                // Daily/habit: once per day
                return new Date(h.date) >= todayStart;
            });

            if (alreadyDone) {
                console.warn(`[completeQuestAction] Duplicate blocked: quest ${quest.id} already completed`);
                return rejectWithValue('Quest already completed today');
            }
        }
        // ======= END FIX =======
        
        const dailyLimit = 15;
        if ((user.dailyCompletionsCount || 0) >= dailyLimit) {
            throw new Error("Энергия иссякла! (Лимит квестов на сегодня исчерпан)");
        }

        // --- HERO CLASS BONUSES ---
        let classMultiplierXp = 1;
        let classMultiplierCoins = 1;
        let bonusName = '';

        if (user.heroClass) {
            if (user.heroClass === 'warrior' && quest.category === 'Sport') { classMultiplierXp = 1.1; bonusName = 'Воин'; } 
            else if (user.heroClass === 'mage' && (quest.category === 'Math' || quest.category === 'Science')) { classMultiplierXp = 1.1; bonusName = 'Маг'; } 
            else if (user.heroClass === 'ranger' && (quest.category === 'Social' || quest.category === 'Ecology')) { classMultiplierXp = 1.1; bonusName = 'Следопыт'; } 
            else if (user.heroClass === 'healer' && quest.category === 'Self') { classMultiplierCoins = 1.1; bonusName = 'Целитель'; }
        }

        let xpReward = Math.floor(quest.xp * multiplier * classMultiplierXp);
        let coinsReward = Math.floor(quest.coins * multiplier * classMultiplierCoins);
        const hpLost = multiplier < 0.5 ? 5 : 0; // Penalty for bad performance

        // For habits, score is 1.0 (100%)
        const score = isAutoComplete ? 1.0 : multiplier;

        // Calculate potential new levels
        let currentLevel = user.level || 1;
        let currentXp = user.currentXp || 0;
        let nextLevelXp = user.nextLevelXp || calculateNextLevelXp(currentLevel);
        let newXpTotal = currentXp + xpReward;
        
        // This calculation is purely for API payload; reducer does its own for state
        while (newXpTotal >= nextLevelXp) {
            newXpTotal -= nextLevelXp;
            currentLevel++;
            nextLevelXp = calculateNextLevelXp(currentLevel);
        }

        if (bonusName) toast.success(`Бонус класса (${bonusName}): +10%`);
        if (hpLost > 0) toast.error(`Потеряно ${hpLost} HP из-за низкого качества!`);

        const historyItem: QuestHistoryItem = { 
            questId: quest.id, 
            questTitle: quest.title, 
            xpEarned: xpReward,
            coinsEarned: coinsReward, // Add this
            date: new Date().toISOString(),
            score: score,
            category: quest.category
        };
        
        // Call Extended API
        try {
            const apiPayload: CompleteQuestPayload = {
                email: user.email,
                questId: quest.id,
                questName: quest.title,
                category: quest.category,
                rarity: quest.rarity,
                score: score, 
                multiplier: multiplier,
                xpEarned: xpReward,
                coinsEarned: coinsReward,
                hpLost: hpLost,
                questHistoryEntry: historyItem,
                newLevel: currentLevel,
                newXp: newXpTotal,
                newNextLevelXp: nextLevelXp,
                newCoins: (user.coins || 0) + coinsReward,
                habitStreaks: quest.isHabit 
                    ? { ...(user.habitStreaks || {}), [String(quest.id)]: ((user.habitStreaks?.[String(quest.id)]) || 0) + 1 }
                    : undefined
            };
            await api.completeQuest(apiPayload);
        } catch (e) { handleApiError(e); }
        
        return { 
            quest, 
            historyItem, 
            xpReward, 
            coinsReward, 
            hpLost,
            newLevel: currentLevel,
            newXp: newXpTotal,
            newNextLevelXp: nextLevelXp
        };
    },
    {
        condition: (_, { getState }) => {
            const state = getState() as StateWithUser;
            if (state.user.pendingActions?.completeQuest) {
                return false;
            }
            return true;
        }
    }
);

export const markQuestCompleted = createAsyncThunk('quests/markCompleted', async (questId: number | string) => {
  return questId;
});
