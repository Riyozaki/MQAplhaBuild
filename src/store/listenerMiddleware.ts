import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import { audio } from '../services/audio';
import { RootState } from './index';
import { 
    addExperience, 
    equipSkinAction, 
    purchaseItemAction, 
    importSaveData,
    submitDailyMood
} from './userSlice';
import { completeQuestAction } from './questsSlice';

export const listenerMiddleware = createListenerMiddleware();

listenerMiddleware.startListening({
    matcher: isAnyOf(completeQuestAction.fulfilled),
    effect: async (action, listenerApi) => {
        const state = listenerApi.getState() as RootState;
        const user = state.user.currentUser;
        
        if (!user) return;

        // Level Up Toast
        // We can check if the level changed by comparing with previous state, 
        // but since we don't have easy access to previous state here without storing it,
        // we can rely on the fact that if completeQuestAction succeeded, we might have leveled up.
        // Actually, the userSlice reducer handles the level up logic and updates the state.
        // The previous implementation had the toast inside the reducer.
        // Ideally, the thunk should return "didLevelUp" flag.
        // But let's check the payload if we modified it to include that info, or just check the user state.
        
        // A better way for "Level Up" is to listen to the state change of user.level
        // But listenerMiddleware is action-based.
        
        // Let's look at the action payload from completeQuestAction (from questsSlice)
        // It returns { quest, historyItem, xpReward, coinsReward, hpLost }
        // It does NOT return new level.
        
        // However, addExperience thunk DOES return "didLevelUp" logic if we move it there.
        // But completeQuestAction in userSlice reducer DUPLICATES the level up logic.
        
        // Strategy:
        // 1. We removed the toast from userSlice reducer.
        // 2. We can just show a generic "Quest Completed" toast here if we want, 
        //    but the user might want specific "Level Up" notification.
        // 3. Let's use the 'addExperience' thunk for XP gains, which handles level up toasts?
        //    No, completeQuestAction handles its own XP logic in the reducer to be atomic.
        
        // Alternative: Compare current level with previous level.
        const prevUser = (listenerApi.getOriginalState() as RootState).user.currentUser;
        if (prevUser && user.level > prevUser.level) {
             audio.playLevelUp();
             toast.success(`Уровень повышен! Теперь ты ${user.level} уровня!`);
        }
        
        // Campaign Day Complete Toast
        if (user.campaign?.isDayComplete && !prevUser?.campaign?.isDayComplete) {
             toast.success("День пройден! (2/3 заданий)", { autoClose: false });
        }
    }
});

listenerMiddleware.startListening({
    actionCreator: equipSkinAction.fulfilled,
    effect: async () => {
        toast.success("Скин успешно экипирован!");
    }
});

listenerMiddleware.startListening({
    actionCreator: importSaveData.fulfilled,
    effect: async () => {
        toast.success("Данные загружены!");
    }
});

listenerMiddleware.startListening({
    actionCreator: purchaseItemAction.fulfilled,
    effect: async (action) => {
        // audio.playCoins() is already in the thunk, which is fine (side effect in thunk is allowed)
        // But we can move UI feedback here if we want.
        // The thunk currently plays audio.
    }
});
