import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../services/api';
import { GuildData, GuildSummary, GuildLeaderboardEntry, GuildMessage } from '../types';
import { RootState } from './index';
import { toast } from 'react-toastify';

interface GuildState {
  guild: GuildData | null;
  guildsList: GuildSummary[];
  guildLeaderboard: GuildLeaderboardEntry[];
  chat: GuildMessage[];
  status: 'idle' | 'loading' | 'failed';
  error: string | null;
}

const initialState: GuildState = {
  guild: null,
  guildsList: [],
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
  async () => {
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
    const response = await api.createGuild(payload.email, payload.name, payload.description, payload.emblem, payload.isOpen);
    if (response.success) {
        toast.success(response.message);
        dispatch(fetchMyGuild(payload.email));
        return response;
    } else {
        throw new Error(response.message || 'Failed to create guild');
    }
  }
);

export const joinGuild = createAsyncThunk(
  'guild/joinGuild',
  async (payload: { email: string; guildId: string }, { dispatch }) => {
    const response = await api.joinGuild(payload.email, payload.guildId);
    toast.success(response.message);
    dispatch(fetchMyGuild(payload.email));
    return response;
  }
);

export const leaveGuild = createAsyncThunk(
  'guild/leaveGuild',
  async (email: string, { dispatch }) => {
    const response = await api.leaveGuild(email);
    toast.info(response.message);
    return response;
  }
);

export const transferLeadership = createAsyncThunk(
  'guild/transferLeadership',
  async (payload: { email: string; newLeaderEmail: string }, { dispatch }) => {
    const response = await api.transferLeadership(payload.email, payload.newLeaderEmail);
    toast.success(response.message);
    dispatch(fetchMyGuild(payload.email));
    return response;
  }
);

export const kickMember = createAsyncThunk(
  'guild/kickMember',
  async (payload: { email: string; targetEmail: string }, { dispatch }) => {
    const response = await api.kickMember(payload.email, payload.targetEmail);
    toast.info(response.message);
    dispatch(fetchMyGuild(payload.email));
    return response;
  }
);

export const setMemberRole = createAsyncThunk(
  'guild/setMemberRole',
  async (payload: { email: string; targetEmail: string; newRole: 'member' | 'officer' }, { dispatch }) => {
    const response = await api.setMemberRole(payload.email, payload.targetEmail, payload.newRole);
    toast.success(response.message);
    dispatch(fetchMyGuild(payload.email));
    return response;
  }
);

export const guildDonate = createAsyncThunk(
  'guild/donate',
  async (payload: { email: string; amount: number }, { dispatch }) => {
    const response = await api.guildDonate(payload.email, payload.amount);
    toast.success(response.message);
    dispatch(fetchMyGuild(payload.email));
    return response;
  }
);

export const updateGuildSettings = createAsyncThunk(
  'guild/updateSettings',
  async (payload: { email: string; settings: { description?: string; emblem?: string; isOpen?: boolean } }, { dispatch }) => {
    const response = await api.updateGuildSettings(payload.email, payload.settings);
    toast.success('Настройки гильдии обновлены');
    dispatch(fetchMyGuild(payload.email));
    return response;
  }
);

export const createGuildQuest = createAsyncThunk(
  'guild/createQuest',
  async (payload: { email: string; questName: string; targetValue: number; questType: string; category: string; rewards: any }, { dispatch }) => {
    const response = await api.createGuildQuest(payload.email, payload.questName, payload.targetValue, payload.questType, payload.category, payload.rewards);
    toast.success('Гильдейский квест создан!');
    dispatch(fetchMyGuild(payload.email));
    return response;
  }
);

export const contributeGuildQuest = createAsyncThunk(
  'guild/contributeQuest',
  async (payload: { email: string; questId: string; amount: number }, { dispatch }) => {
    const response = await api.contributeGuildQuest(payload.email, payload.questId, payload.amount);
    if (response.completed) {
        toast.success('Квест завершен! Награды распределены.');
    } else {
        toast.info('Вклад внесен!');
    }
    dispatch(fetchMyGuild(payload.email));
    return response;
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
      .addCase(fetchGuildsList.fulfilled, (state, action) => {
        state.guildsList = action.payload;
      })
      // Fetch Leaderboard
      .addCase(fetchGuildLeaderboard.fulfilled, (state, action) => {
        state.guildLeaderboard = action.payload;
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
