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
    matcher: isAnyOf(completeQuestAction.fulfilled, addExperience.fulfilled),
    effect: async (action, listenerApi) => {
        const state = listenerApi.getState() as RootState;
        const user = state.user.currentUser;
        
        if (!user) return;

        // Quest Completion Audio
        if (completeQuestAction.fulfilled.match(action)) {
             const { quest } = action.payload;
             if (quest.isHabit) {
                 audio.playCoins();
             } else {
                 audio.playQuestComplete();
             }
        }

        // Level Up Toast
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
    actionCreator: submitDailyMood.fulfilled,
    effect: async () => {
        toast.success("Настроение учтено! +30 XP");
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
