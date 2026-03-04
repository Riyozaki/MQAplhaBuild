import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../services/api';
import { GuildData, GuildSummary, GuildLeaderboardEntry, GuildMessage } from '../types';
import { toast } from 'react-toastify';

interface GuildState {
  guild: GuildData | null;
  guildsList: GuildSummary[];
  lastGuildsFetch: number; // v3.3: Caching
  guildLeaderboard: GuildLeaderboardEntry[];
  chat: GuildMessage[];
  status: 'idle' | 'loading' | 'failed';
  error: string | null;
}

const initialState: GuildState = {
  guild: null,
  guildsList: [],
  lastGuildsFetch: 0,
  guildLeaderboard: [],
  chat: [],
  status: 'idle',
  error: null,
};

// --- Thunks ---

export const fetchMyGuild = createAsyncThunk(
  'guild/fetchMyGuild',
  async (email: string) => {
    const response = await api.getMyGuild(email);
    return response.data;
  }
);

export const fetchGuildsList = createAsyncThunk(
  'guild/fetchGuildsList',
  async (force: boolean = false, { getState }) => {
    const state = (getState() as any).guild as GuildState;
    const now = Date.now();

    // v3.3: Cache for 2 minutes to prevent constant reloading
    if (!force && state.guildsList.length > 0 && (now - state.lastGuildsFetch < 120000)) {
        return state.guildsList;
    }

    const response = await api.getGuildsList();
    return response.data;
  }
);

export const fetchGuildLeaderboard = createAsyncThunk(
  'guild/fetchGuildLeaderboard',
  async () => {
    const response = await api.getGuildLeaderboard();
    return response.data;
  }
);

export const fetchGuildChat = createAsyncThunk(
  'guild/fetchGuildChat',
  async (email: string) => {
    const response = await api.getGuildChat(email);
    return response.data;
  }
);

export const createGuild = createAsyncThunk(
  'guild/createGuild',
  async (payload: { email: string; name: string; description: string; emblem: string; isOpen: boolean }, { dispatch }) => {
    try {
      const response = await api.createGuild(payload.email, payload.name, payload.description, payload.emblem, payload.isOpen);
      if (response.success) {
          // v3.3: Fix for openness - force update settings if it should be closed
          if (payload.isOpen === false) {
             try {
                 await api.updateGuildSettings(payload.email, { isOpen: false });
             } catch (e) {
                 console.warn("Failed to enforce closed guild status", e);
             }
          }

          dispatch(fetchMyGuild(payload.email));
          // Force refresh list to show new guild
          dispatch(fetchGuildsList(true));
          return response;
      } else {
          throw new Error(response.message || 'Failed to create guild');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create guild');
      throw error;
    }
  }
);

export const joinGuild = createAsyncThunk(
  'guild/joinGuild',
  async (payload: { email: string; guildId: string }, { dispatch }) => {
    try {
      const response = await api.joinGuild(payload.email, payload.guildId);
      if (response.success) {
          toast.success(response.message);
          dispatch(fetchMyGuild(payload.email));
          return response;
      } else {
          throw new Error(response.message || 'Failed to join guild');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to join guild');
      throw error;
    }
  }
);

export const leaveGuild = createAsyncThunk(
  'guild/leaveGuild',
  async (email: string, { dispatch }) => {
    try {
      const response = await api.leaveGuild(email);
      if (response.success) {
          toast.info(response.message);
          return response;
      } else {
          throw new Error(response.message || 'Failed to leave guild');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to leave guild');
      throw error;
    }
  }
);

export const transferLeadership = createAsyncThunk(
  'guild/transferLeadership',
  async (payload: { email: string; newLeaderEmail: string }, { dispatch }) => {
    try {
      const response = await api.transferLeadership(payload.email, payload.newLeaderEmail);
      if (response.success) {
          toast.success(response.message);
          dispatch(fetchMyGuild(payload.email));
          return response;
      } else {
          throw new Error(response.message || 'Failed to transfer leadership');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to transfer leadership');
      throw error;
    }
  }
);

export const kickMember = createAsyncThunk(
  'guild/kickMember',
  async (payload: { email: string; targetEmail: string }, { dispatch }) => {
    try {
      const response = await api.kickMember(payload.email, payload.targetEmail);
      if (response.success) {
          toast.info(response.message);
          dispatch(fetchMyGuild(payload.email));
          return response;
      } else {
          throw new Error(response.message || 'Failed to kick member');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to kick member');
      throw error;
    }
  }
);

export const setMemberRole = createAsyncThunk(
  'guild/setMemberRole',
  async (payload: { email: string; targetEmail: string; newRole: 'member' | 'officer' }, { dispatch }) => {
    try {
      const response = await api.setMemberRole(payload.email, payload.targetEmail, payload.newRole);
      if (response.success) {
          toast.success(response.message);
          dispatch(fetchMyGuild(payload.email));
          return response;
      } else {
          throw new Error(response.message || 'Failed to set member role');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to set member role');
      throw error;
    }
  }
);

export const guildDonate = createAsyncThunk(
  'guild/donate',
  async (payload: { email: string; amount: number }, { dispatch }) => {
    try {
      const response = await api.guildDonate(payload.email, payload.amount);
      if (response.success) {
          toast.success(response.message);
          dispatch(fetchMyGuild(payload.email));
          return response;
      } else {
          throw new Error(response.message || 'Failed to donate');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to donate');
      throw error;
    }
  }
);

export const updateGuildSettings = createAsyncThunk(
  'guild/updateSettings',
  async (payload: { email: string; settings: { description?: string; emblem?: string; isOpen?: boolean } }, { dispatch }) => {
    try {
      const response = await api.updateGuildSettings(payload.email, payload.settings);
      if (response.success) {
          toast.success('Настройки гильдии обновлены');
          dispatch(fetchMyGuild(payload.email));
          return response;
      } else {
          throw new Error('Failed to update settings');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update settings');
      throw error;
    }
  }
);

export const createGuildQuest = createAsyncThunk(
  'guild/createQuest',
  async (payload: { email: string; questName: string; targetValue: number; questType: string; category: string; rewards: any }, { dispatch }) => {
    try {
      const response = await api.createGuildQuest(payload.email, payload.questName, payload.targetValue, payload.questType, payload.category, payload.rewards);
      if (response.success) {
          toast.success('Гильдейский квест создан!');
          dispatch(fetchMyGuild(payload.email));
          return response;
      } else {
          throw new Error('Failed to create quest');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create quest');
      throw error;
    }
  }
);

export const contributeGuildQuest = createAsyncThunk(
  'guild/contributeQuest',
  async (payload: { email: string; questId: string; amount: number }, { dispatch }) => {
    try {
      const response = await api.contributeGuildQuest(payload.email, payload.questId, payload.amount);
      if (response.success) {
          if (response.completed) {
              toast.success('Квест завершен! Награды распределены.');
          } else {
              toast.info('Вклад внесен!');
          }
          dispatch(fetchMyGuild(payload.email));
          return response;
      } else {
          throw new Error(response.message || 'Failed to contribute');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to contribute');
      throw error;
    }
  }
);

export const sendGuildMessage = createAsyncThunk(
  'guild/sendMessage',
  async (payload: { email: string; message: string; messageType?: 'text' | 'system' | 'achievement' }, { dispatch }) => {
    const response = await api.sendGuildMessage(payload.email, payload.message, payload.messageType);
    dispatch(fetchGuildChat(payload.email));
    return response;
  }
);


const guildSlice = createSlice({
  name: 'guild',
  initialState,
  reducers: {
    setGuild: (state, action: PayloadAction<GuildData | null>) => {
      state.guild = action.payload;
    },
    clearGuild: (state) => {
      state.guild = null;
      state.chat = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch My Guild
      .addCase(fetchMyGuild.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMyGuild.fulfilled, (state, action) => {
        state.status = 'idle';
        state.guild = action.payload;
      })
      .addCase(fetchMyGuild.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch guild';
      })
      // Fetch Guilds List
      .addCase(fetchGuildsList.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchGuildsList.fulfilled, (state, action) => {
        state.status = 'idle';
        state.guildsList = action.payload;
        state.lastGuildsFetch = Date.now();
      })
      .addCase(fetchGuildsList.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch guilds list';
      })
      // Fetch Leaderboard
      .addCase(fetchGuildLeaderboard.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchGuildLeaderboard.fulfilled, (state, action) => {
        state.status = 'idle';
        state.guildLeaderboard = action.payload;
      })
      .addCase(fetchGuildLeaderboard.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch leaderboard';
      })
      // Fetch Chat
      .addCase(fetchGuildChat.fulfilled, (state, action) => {
        state.chat = action.payload;
      })
      // Leave Guild
      .addCase(leaveGuild.fulfilled, (state) => {
        state.guild = null;
        state.chat = [];
      })
      // Create Guild
      .addCase(createGuild.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createGuild.fulfilled, (state) => {
        state.status = 'idle';
      })
      .addCase(createGuild.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to create guild';
      });
  },
});

export const { setGuild, clearGuild } = guildSlice.actions;
export default guildSlice.reducer;
