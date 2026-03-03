import { createSlice } from '@reduxjs/toolkit';
import { Quest } from '../types';
import { fetchQuests, completeQuestAction, markQuestCompleted } from './actions';

interface QuestsState {
  list: Quest[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: QuestsState = {
  list: [],
  status: 'idle',
  error: null
};

const questsSlice = createSlice({
  name: 'quests',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchQuests.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchQuests.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
      })
      .addCase(fetchQuests.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch quests';
      })
      .addCase(markQuestCompleted.fulfilled, (state, action) => {
        const quest = state.list.find(q => q.id === action.payload);
        if (quest) quest.completed = true;
      })
      .addCase(completeQuestAction.fulfilled, (state, action) => {
          const { quest } = action.payload;
          const q = state.list.find(i => i.id === quest.id);
          if (q) q.completed = true;
      });
  },
});

export { fetchQuests, completeQuestAction, markQuestCompleted };
export default questsSlice.reducer;
