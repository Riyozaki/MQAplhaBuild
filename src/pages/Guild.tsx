import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchMyGuild, leaveGuild, guildDonate } from '../store/guildSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, LogOut, Settings, MessageSquare, Trophy, Coins, Crown, Star, Swords, Target, ChevronRight, Copy, Check, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getAvatarData } from '../data/avatars';
import GuildChat from '../components/GuildChat';
import GuildSettingsModal from '../components/GuildSettingsModal';
import GuildQuestModal from '../components/GuildQuestModal';
import { GuildQuest } from '../types';
import Modal from 'react-modal';

import ErrorBoundary from '../components/ErrorBoundary';

const Guild: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { guild, status } = useSelector((state: RootState) => state.guild);
  const { currentUser } = useSelector((state: RootState) => state.user);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'quests'>('overview');
  const [copiedId, setCopiedId] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<GuildQuest | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [donateAmount, setDonateAmount] = useState('');

  useEffect(() => {
    if (currentUser?.email) {
      dispatch(fetchMyGuild(currentUser.email));
    }
  }, [dispatch, currentUser]);

  const handleLeave = () => {
    if (!currentUser?.email) return;
    if (guild?.myRole === 'leader') {
      toast.error('Передайте лидерство перед выходом!');
      return;
    }
    setShowLeaveConfirm(true);
  };

  const confirmLeave = async () => {
    if (!currentUser?.email) return;
    await dispatch(leaveGuild(currentUser.email));
    setShowLeaveConfirm(false);
    navigate('/');
  };

  const getTimeRemaining = (expiresAt: string | undefined) => {
    if (!expiresAt) return 'Неизвестно';
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (isNaN(diff)) return 'Неизвестно';
    if (diff <= 0) return 'Истёк';
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `Истекает через ${hours}ч`;
    return `Истекает через ${Math.floor(hours / 24)}д`;
  };

  const copyGuildId = () => {
    if (guild?.guildId) {
      navigator.clipboard.writeText(guild.guildId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
      toast.success('ID гильдии скопирован!');
    }
  };

  const handleDonate = () => {
    setShowDonateModal(true);
    setDonateAmount('');
  };

  const confirmDonate = async () => {
    if (!currentUser?.email) return;
    const val = Number(donateAmount);
    
    if (!val || isNaN(val) || val <= 0) {
        toast.error("Введите корректную сумму!");
        return;
    }
    if (currentUser.coins < val) {
        toast.error("Недостаточно монет!");
        return;
    }
    
    await dispatch(guildDonate({ email: currentUser.email, amount: val }));
    setShowDonateModal(false);
    setDonateAmount('');
  };

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-slate-400 animate-pulse">Входим в зал гильдии...</p>
      </div>
    );
  }

  if (!guild) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border-2 border-slate-700 border-dashed">
          <Shield className="w-10 h-10 text-slate-600" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Вы не состоите в гильдии</h2>
        <p className="text-slate-400 max-w-md mb-8">
          Присоединитесь к существующей гильдии или создайте свою, чтобы получать бонусы и участвовать в турнирах.
        </p>
        <button
          onClick={() => navigate('/guilds')}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-900/20 flex items-center gap-2"
        >
          <Shield size={18} />
          Найти гильдию
        </button>
      </div>
    );
  }

  const isLeader = guild.myRole === 'leader';
  const isOfficer = guild.myRole === 'officer';
  const canManage = isLeader || isOfficer;

  return (
    <div className="max-w-4xl mx-auto pb-20 space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-slate-900" />
        
        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            {/* Emblem */}
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-6xl sm:text-7xl shadow-xl shrink-0">
              {guild.emblem}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight truncate">
                    {guild.name}
                  </h1>
                  <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs font-mono">
                      ID: {guild.guildId.slice(0, 8)}...
                    </span>
                    <button 
                      onClick={copyGuildId}
                      className="p-1 hover:text-white transition-colors"
                      title="Скопировать ID"
                    >
                      {copiedId ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                
                {canManage && (
                  <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 bg-slate-800/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
                  >
                    <Settings size={20} />
                  </button>
                )}
              </div>

              <p className="text-slate-400 text-sm sm:text-base line-clamp-2">
                {guild.description}
              </p>

              {/* Stats Row */}
              <div className="flex flex-wrap gap-3 pt-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-900/20 border border-amber-500/20 text-amber-200 text-xs font-bold">
                  <Crown size={14} className="text-amber-400" />
                  Ур. {guild.guildLevel.level}
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900/20 border border-blue-500/20 text-blue-200 text-xs font-bold">
                  <Users size={14} className="text-blue-400" />
                  {guild.memberCount}/{guild.maxMembers}
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900/20 border border-emerald-500/20 text-emerald-200 text-xs font-bold cursor-pointer hover:bg-emerald-900/40 transition-colors" onClick={handleDonate} title="Пожертвовать в казну">
                  <Coins size={14} className="text-emerald-400" />
                  {guild.treasury}
                  <PlusCircle size={12} className="ml-1 opacity-50" />
                </div>
              </div>
            </div>
          </div>

          {/* XP Bar */}
          <div className="mt-8 space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Прогресс гильдии</span>
              <span>{guild.guildLevel.currentXp} / {guild.guildLevel.nextLevelXp || 'MAX'} XP</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (guild.guildLevel.currentXp / (guild.guildLevel.nextLevelXp || 1)) * 100)}%` }}
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-900/50 rounded-xl border border-slate-800 backdrop-blur-sm">
        {(['overview', 'members', 'quests'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${
              activeTab === tab
                ? 'bg-slate-800 text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab === 'overview' && 'Обзор'}
            {tab === 'members' && 'Участники'}
            {tab === 'quests' && 'Задания'}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bonuses Card */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Star className="text-yellow-400" size={20} />
                  Бонусы гильдии
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-slate-300 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                      XP
                    </div>
                    <div>
                      <div className="font-bold text-white">+5% к опыту</div>
                      <div className="text-xs text-slate-500">За выполнение заданий</div>
                    </div>
                  </li>
                  <li className="flex items-center gap-3 text-slate-300 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                      <Coins size={16} />
                    </div>
                    <div>
                      <div className="font-bold text-white">Казна гильдии</div>
                      <div className="text-xs text-slate-500">Доступ к общим ресурсам</div>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Chat */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden min-h-[500px]">
                <GuildChat />
              </div>

              {/* Leave Button */}
              <div className="md:col-span-2 flex justify-center pt-4">
                <button
                  onClick={handleLeave}
                  className="text-red-400 hover:text-red-300 text-sm font-medium flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-900/10 transition-colors"
                >
                  <LogOut size={16} />
                  Покинуть гильдию
                </button>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="divide-y divide-slate-800">
                {guild.members.map((member) => (
                  <div key={member.email} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl">
                        {(() => {
                           // Mock avatar logic if needed, or use first letter
                           return member.username.charAt(0).toUpperCase();
                        })()}
                      </div>
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          {member.username}
                          {member.role === 'leader' && <Crown size={14} className="text-amber-400" />}
                          {member.role === 'officer' && <Shield size={14} className="text-blue-400" />}
                        </div>
                        <div className="text-xs text-slate-500">
                          Ур. {member.level} • {member.className || 'Новичок'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-indigo-400">{member.xpContributed} XP</div>
                      <div className="text-[10px] text-slate-600 uppercase font-bold">Вклад</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'quests' && (
            <div className="space-y-4">
              {guild.quests.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800">
                  <Target className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-slate-300">Нет активных заданий</h3>
                  <p className="text-sm text-slate-500">Лидер гильдии пока не назначил новые цели.</p>
                </div>
              ) : (
                guild.quests.map((quest) => (
                  <div key={quest.questId} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-white text-lg">{quest.questName}</h3>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-slate-800 rounded text-slate-400">{quest.category}</span>
                          <span>•</span>
                          <span>{getTimeRemaining(quest.expiresAt)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-indigo-400">
                          {quest.currentValue} / {quest.targetValue}
                        </div>
                      </div>
                    </div>
                    
                    <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden mb-4">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                        style={{ width: `${Math.min(100, (quest.currentValue / quest.targetValue) * 100)}%` }}
                      />
                    </div>

                    <div className="flex justify-end">
                      <button 
                        onClick={() => setSelectedQuest(quest)}
                        className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-sm font-bold rounded-lg transition-colors border border-indigo-500/30"
                      >
                        Внести вклад
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsOpen && (
          <ErrorBoundary>
            <GuildSettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
            />
          </ErrorBoundary>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedQuest && (
          <GuildQuestModal 
            quest={selectedQuest} 
            onClose={() => setSelectedQuest(null)} 
          />
        )}
      </AnimatePresence>

      {/* Leave Confirmation Modal */}
      <Modal
        isOpen={showLeaveConfirm}
        onRequestClose={() => setShowLeaveConfirm(false)}
        className="outline-none focus:outline-none"
        overlayClassName="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        ariaHideApp={false}
      >
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
          <h3 className="text-xl font-bold text-white mb-2">Покинуть гильдию?</h3>
          <p className="text-slate-400 mb-6">
            Вы потеряете доступ к чату, бонусам и заданиям гильдии. Это действие нельзя отменить.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowLeaveConfirm(false)}
              className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={confirmLeave}
              className="flex-1 py-2 rounded-xl bg-red-600/20 text-red-400 border border-red-600/30 font-bold hover:bg-red-600/30 transition-colors"
            >
              Покинуть
            </button>
          </div>
        </div>
      </Modal>

      {/* Donate Modal */}
      <Modal
        isOpen={showDonateModal}
        onRequestClose={() => setShowDonateModal(false)}
        className="outline-none focus:outline-none"
        overlayClassName="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        ariaHideApp={false}
      >
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Coins className="text-emerald-400" /> Пожертвование
          </h3>
          <div className="mb-6">
            <label className="block text-slate-400 text-sm mb-2">Сумма пожертвования</label>
            <input
              type="number"
              value={donateAmount}
              onChange={(e) => setDonateAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-lg"
              autoFocus
            />
            <div className="text-right text-xs text-slate-500 mt-1">
              Ваш баланс: {currentUser?.coins || 0}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDonateModal(false)}
              className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={confirmDonate}
              className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors shadow-lg shadow-emerald-900/20"
            >
              Пожертвовать
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Guild;
