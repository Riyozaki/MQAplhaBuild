import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchGuildsList, joinGuild, createGuild } from '../store/guildSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, Search, PlusCircle, Lock, Unlock, Crown, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const GuildsList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { guildsList, status } = useSelector((state: RootState) => state.guild);
  const { currentUser } = useSelector((state: RootState) => state.user);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Create Guild Form State
  const [newGuildName, setNewGuildName] = useState('');
  const [newGuildDesc, setNewGuildDesc] = useState('');
  const [newGuildEmblem, setNewGuildEmblem] = useState('🛡️');
  const [newGuildOpen, setNewGuildOpen] = useState(true);

  const emblems = ['🛡️', '⚔️', '🏰', '🐉', '🔥', '⚡', '🌟', '👑', '🦅', '🦁', '🐺', '💀'];

  useEffect(() => {
    dispatch(fetchGuildsList());
  }, [dispatch]);

  const handleJoin = async (guildId: string) => {
    if (!currentUser?.email) return;
    if (window.confirm(`Вступить в гильдию?`)) {
        await dispatch(joinGuild({ email: currentUser.email, guildId }));
    }
  };

  const handleCreateGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.email) return;
    
    if ((currentUser.coins || 0) < 100) {
        toast.error('Недостаточно монет! Нужно 100 💰');
        return;
    }

    if (!newGuildName.trim() || !newGuildDesc.trim()) {
        toast.error('Заполните все поля!');
        return;
    }

    const result = await dispatch(createGuild({
        email: currentUser.email,
        name: newGuildName,
        description: newGuildDesc,
        emblem: newGuildEmblem,
        isOpen: newGuildOpen
    }));

    if (createGuild.fulfilled.match(result)) {
        setIsCreateModalOpen(false);
        toast.success('Гильдия создана! -100 монет');
    }
  };

  const filteredGuilds = guildsList.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    g.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-900/50">
                <Shield className="w-8 h-8 text-white" />
            </div>
            Гильдии
          </h1>
          <p className="text-slate-400 text-sm mt-1 ml-1">
            Объединяйтесь с другими героями для выполнения эпических заданий
          </p>
        </div>
        
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/30 hover:shadow-indigo-900/50 hover:-translate-y-0.5"
        >
          <PlusCircle className="w-5 h-5" />
          Создать гильдию
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
        <input 
          type="text" 
          placeholder="Поиск гильдии по названию..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
        />
      </div>

      {/* Guilds Grid */}
      {status === 'loading' ? (
        <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
                {filteredGuilds.map((guild, idx) => (
                <motion.div
                    key={guild.guildId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-slate-900/50 hover:bg-slate-800/80 rounded-2xl p-6 border border-slate-800 hover:border-indigo-500/30 transition-all duration-300 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Shield size={120} />
                    </div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-4xl shadow-inner border border-slate-700 group-hover:scale-110 transition-transform duration-300">
                                {guild.emblem}
                            </div>
                            <div className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                                guild.isOpen 
                                    ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/20' 
                                    : 'bg-rose-900/20 text-rose-400 border-rose-500/20'
                            } flex items-center gap-1.5`}>
                                {guild.isOpen ? <Unlock size={12} /> : <Lock size={12} />}
                                {guild.isOpen ? 'Открыта' : 'Закрыта'}
                            </div>
                        </div>
                        
                        <h3 className="text-xl font-bold text-white mb-1 truncate pr-2">{guild.name}</h3>
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-3">
                            <Crown size={14} />
                            <span>Уровень {guild.level}</span>
                        </div>

                        <p className="text-slate-400 text-sm mb-6 line-clamp-2 h-10">
                            {guild.description}
                        </p>

                        <div className="flex items-center justify-between mt-auto">
                            <div className="flex items-center gap-1.5 text-slate-500 text-sm font-medium">
                                <Users size={16} />
                                <span>{guild.memberCount} / {guild.maxMembers}</span>
                            </div>

                            <button
                                onClick={() => handleJoin(guild.guildId)}
                                disabled={!guild.isOpen || guild.memberCount >= guild.maxMembers}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                    !guild.isOpen || guild.memberCount >= guild.maxMembers
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20'
                                }`}
                            >
                                {guild.memberCount >= guild.maxMembers ? 'Мест нет' : 'Вступить'}
                            </button>
                        </div>
                    </div>
                </motion.div>
                ))}
            </AnimatePresence>
        </div>
      )}

      {filteredGuilds.length === 0 && status !== 'loading' && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-10 h-10 text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Гильдии не найдены</h3>
          <p className="text-slate-500">Попробуйте изменить поисковый запрос или создайте свою гильдию.</p>
        </div>
      )}

      {/* Create Guild Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
                >
                    <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <PlusCircle className="text-indigo-500" />
                            Создание гильдии
                        </h2>
                        <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <form onSubmit={handleCreateGuild} className="p-6 space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Название</label>
                            <input 
                                type="text" 
                                value={newGuildName}
                                onChange={(e) => setNewGuildName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="Например: Орден Феникса"
                                maxLength={30}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Девиз / Описание</label>
                            <textarea 
                                value={newGuildDesc}
                                onChange={(e) => setNewGuildDesc(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none h-24"
                                placeholder="Краткое описание целей вашей гильдии..."
                                maxLength={100}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-3">Эмблема</label>
                            <div className="flex flex-wrap gap-2">
                                {emblems.map(emoji => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => setNewGuildEmblem(emoji)}
                                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                                            newGuildEmblem === emoji 
                                                ? 'bg-indigo-600 shadow-lg scale-110' 
                                                : 'bg-slate-800 hover:bg-slate-700'
                                        }`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer" onClick={() => setNewGuildOpen(!newGuildOpen)}>
                            <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                                newGuildOpen ? 'bg-indigo-600 border-indigo-600' : 'border-slate-600'
                            }`}>
                                {newGuildOpen && <Check size={16} className="text-white" />}
                            </div>
                            <div>
                                <div className="font-bold text-white text-sm">Открытая гильдия</div>
                                <div className="text-xs text-slate-500">Любой может вступить без подтверждения</div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button 
                                type="submit"
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-900/30 active:scale-[0.98]"
                            >
                                Создать за 100 монет
                            </button>
                            <p className="text-center text-xs text-slate-500 mt-3">
                                Создание гильдии стоит 100 монет. Вы станете её лидером.
                            </p>
                        </div>
                    </form>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GuildsList;
