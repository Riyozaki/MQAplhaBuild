import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { contributeGuildQuest } from '../store/guildSlice';
import { X, Target, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { GuildQuest } from '../types';

interface GuildQuestModalProps {
  quest: GuildQuest;
  onClose: () => void;
}

const GuildQuestModal: React.FC<GuildQuestModalProps> = ({ quest, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { currentUser } = useSelector((state: RootState) => state.user);
  const [amount, setAmount] = useState(1);

  if (!currentUser) return null;

  const handleContribute = async () => {
    if (amount <= 0) return;
    
    const maxContribution = quest.targetValue - quest.currentValue;
    if (amount > maxContribution) {
        // This should be prevented by input max, but double check
        return;
    }

    await dispatch(contributeGuildQuest({
        email: currentUser.email,
        questId: quest.questId,
        amount
    }));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Target className="text-indigo-500" />
            Вклад в задание
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">{quest.questName}</h3>
            <p className="text-slate-400 text-sm">
                Осталось собрать: <span className="text-indigo-400 font-bold">{quest.targetValue - quest.currentValue}</span>
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500">Прогресс</span>
                <span className="text-white font-bold">{Math.round((quest.currentValue / quest.targetValue) * 100)}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-indigo-500" 
                    style={{ width: `${Math.min(100, (quest.currentValue / quest.targetValue) * 100)}%` }}
                />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2">Ваш вклад</label>
            <div className="flex gap-2">
                <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => {
                        const remaining = quest.targetValue - quest.currentValue;
                        setAmount(Math.max(1, Math.min(remaining, Number(e.target.value))));
                    }}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none font-bold text-center"
                    min="1"
                />
                <button 
                    onClick={handleContribute}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 rounded-xl transition-colors shadow-lg shadow-indigo-900/30"
                >
                    Внести
                </button>
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
                Вы получите XP и монеты за вклад в развитие гильдии.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default GuildQuestModal;
