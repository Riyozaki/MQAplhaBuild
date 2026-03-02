import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { updateGuildSettings, kickMember, setMemberRole, createGuildQuest } from '../store/guildSlice';
import { X, Save, UserMinus, Shield, Crown, Plus, Trash2, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

interface GuildSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GuildSettingsModal: React.FC<GuildSettingsModalProps> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { guild } = useSelector((state: RootState) => state.guild);
  const { currentUser } = useSelector((state: RootState) => state.user);
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'quests'>('general');

  // General Settings State
  const [description, setDescription] = useState(guild?.description || '');
  const [isOpenGuild, setIsOpenGuild] = useState(guild?.settings?.isOpen ?? true);
  const [emblem, setEmblem] = useState(guild?.emblem || '🛡️');

  // Quest Creation State
  const [questName, setQuestName] = useState('');
  const [questTarget, setQuestTarget] = useState(10);
  const [questCategory, setQuestCategory] = useState('General');

  if (!isOpen || !guild || !currentUser) return null;

  const handleSaveSettings = async () => {
    await dispatch(updateGuildSettings({
        email: currentUser.email,
        settings: {
            description,
            emblem,
            isOpen: isOpenGuild
        }
    }));
    onClose();
  };

  const handleKick = async (targetEmail: string) => {
    if (window.confirm('Вы уверены, что хотите исключить этого участника?')) {
        await dispatch(kickMember({ email: currentUser.email, targetEmail }));
    }
  };

  const handlePromote = async (targetEmail: string, currentRole: string) => {
    const newRole = currentRole === 'member' ? 'officer' : 'member';
    await dispatch(setMemberRole({ email: currentUser.email, targetEmail, newRole }));
  };

  const handleCreateQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questName.trim()) return;

    await dispatch(createGuildQuest({
        email: currentUser.email,
        questName,
        targetValue: questTarget,
        questType: 'collective',
        category: questCategory,
        rewards: { xp: 100, coins: 50, reputation: 10 }
    }));
    setQuestName('');
    setQuestTarget(10);
    toast.success('Квест создан!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="text-indigo-500" />
            Управление гильдией
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          {(['general', 'members', 'quests'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-bold transition-colors ${
                activeTab === tab
                  ? 'bg-slate-800 text-white border-b-2 border-indigo-500'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
              }`}
            >
              {tab === 'general' && 'Настройки'}
              {tab === 'members' && 'Участники'}
              {tab === 'quests' && 'Задания'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Описание гильдии</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none h-32"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Эмблема</label>
                <input 
                  type="text" 
                  value={emblem}
                  onChange={(e) => setEmblem(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  maxLength={2}
                />
              </div>

              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={isOpenGuild}
                  onChange={(e) => setIsOpenGuild(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-white font-medium">Открытая гильдия (вход без приглашения)</span>
              </div>

              <button 
                onClick={handleSaveSettings}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-900/30"
              >
                Сохранить изменения
              </button>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-4">
              {guild.members.map((member) => (
                <div key={member.email} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-white">
                      {member.username.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        {member.username}
                        {member.role === 'leader' && <Crown size={14} className="text-amber-400" />}
                        {member.role === 'officer' && <Shield size={14} className="text-blue-400" />}
                      </div>
                      <div className="text-xs text-slate-500">{member.email}</div>
                    </div>
                  </div>

                  {member.role !== 'leader' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handlePromote(member.email, member.role)}
                        className="p-2 text-slate-400 hover:text-indigo-400 transition-colors"
                        title={member.role === 'member' ? 'Повысить до офицера' : 'Понизить до участника'}
                      >
                        <Shield size={18} />
                      </button>
                      <button 
                        onClick={() => handleKick(member.email)}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                        title="Исключить"
                      >
                        <UserMinus size={18} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'quests' && (
            <div className="space-y-6">
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Plus size={18} className="text-indigo-500" />
                  Создать новое задание
                </h3>
                <form onSubmit={handleCreateQuest} className="space-y-4">
                  <div>
                    <input 
                      type="text" 
                      value={questName}
                      onChange={(e) => setQuestName(e.target.value)}
                      placeholder="Название задания"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Цель (кол-во)</label>
                      <input 
                        type="number" 
                        value={questTarget}
                        onChange={(e) => setQuestTarget(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Категория</label>
                      <select 
                        value={questCategory}
                        onChange={(e) => setQuestCategory(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none"
                      >
                        <option value="General">Общее</option>
                        <option value="Math">Математика</option>
                        <option value="Science">Наука</option>
                        <option value="Sport">Спорт</option>
                      </select>
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-sm transition-colors"
                  >
                    Создать задание
                  </button>
                </form>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-slate-400 text-sm uppercase tracking-wider">Активные задания</h3>
                {guild.quests.map((quest) => (
                  <div key={quest.questId} className="flex justify-between items-center p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <div>
                      <div className="font-medium text-white">{quest.questName}</div>
                      <div className="text-xs text-slate-500">
                        {quest.currentValue} / {quest.targetValue} • {quest.category}
                      </div>
                    </div>
                    {/* Delete button hidden until API implementation */}
                    {/* <button className="text-slate-500 hover:text-red-400 transition-colors">
                      <Trash2 size={16} />
                    </button> */}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default GuildSettingsModal;
