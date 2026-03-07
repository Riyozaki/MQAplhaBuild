
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { GradeGroup } from '../types';
import { 
    addExperience, 
    adminSetDay, 
    adminCompleteDay, 
    adminResetCampaign,
    advanceCampaignDay,
} from '../store/userSlice';
import { completeQuestAction } from '../store/questsSlice';
import { markQuestCompleted } from '../store/questsSlice';
import { CAMPAIGN_DATA } from '../data/campaignData';
import { Settings, Zap, ArrowRight, CheckCircle, RotateCcw, Coins, ChevronUp, ChevronDown, Lock, Unlock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

const AdminControls: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const user = useSelector((state: RootState) => state.user.currentUser);
    const questsList = useSelector((state: RootState) => state.quests.list);
    
    // Panel States
    const [isOpen, setIsOpen] = useState(false);

    // Show only for admin role
    if (!user || user.role !== 'admin') return null;

    // --- Actions ---

    const togglePanel = () => {
        setIsOpen(!isOpen);
    };

    const handleAddResources = () => {
        dispatch(addExperience({ xp: 1000, coins: 1000 }));
        toast.success("Ресурсы добавлены (Override)");
    };

    const handleCompleteDayQuests = async () => {
        const currentDay = user.campaign?.currentDay || 1;
        const storyDay = CAMPAIGN_DATA.find(d => d.day === currentDay);
        
        if (storyDay) {
            const gradeGroup = (user.gradeGroup || 'grade67') as GradeGroup;
            const ids = Array.isArray(storyDay.questIds) 
                ? storyDay.questIds 
                : (storyDay.questIds[gradeGroup] || storyDay.questIds['grade67'] || []);

            for (const questId of ids) {
                const quest = questsList.find(q => q.id === questId);
                if (quest) {
                    await dispatch(markQuestCompleted(questId));
                    await dispatch(completeQuestAction({ quest, multiplier: 1 }));
                }
            }
            dispatch(adminCompleteDay());
            toast.success(`День ${currentDay} пройден моментально!`);
        }
    };

    const handleSkipDay = () => {
        dispatch(adminCompleteDay()); // Force complete flag
        setTimeout(() => {
            dispatch(advanceCampaignDay()); // Then advance
        }, 100);
    };

    const handleReset = () => {
        if(window.confirm("Сбросить весь прогресс кампании?")) {
            dispatch(adminResetCampaign());
            toast.info("Кампания сброшена");
        }
    };

    return (
        <div className="fixed bottom-4 left-4 z-[9999]">
            <AnimatePresence>
                {/* Control Panel */}
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="mb-4 bg-slate-900/95 backdrop-blur-xl border border-amber-500/50 p-4 rounded-2xl shadow-2xl w-64"
                    >
                        <div className="flex items-center justify-between mb-3 border-b border-amber-500/30 pb-2">
                            <span className="text-amber-400 font-bold uppercase text-xs tracking-wider flex items-center gap-2">
                                <Unlock size={14} /> Master Key
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">UNLOCKED</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <button 
                                onClick={handleCompleteDayQuests}
                                className="bg-emerald-900/40 hover:bg-emerald-800/40 text-emerald-400 text-xs font-bold py-2 px-2 rounded border border-emerald-500/30 flex flex-col items-center gap-1"
                            >
                                <CheckCircle size={14} />
                                Выполнить День
                            </button>
                            
                            <button 
                                onClick={handleSkipDay}
                                className="bg-blue-900/40 hover:bg-blue-800/40 text-blue-400 text-xs font-bold py-2 px-2 rounded border border-blue-500/30 flex flex-col items-center gap-1"
                            >
                                <ArrowRight size={14} />
                                След. День
                            </button>

                            <button 
                                onClick={handleAddResources}
                                className="bg-amber-900/40 hover:bg-amber-800/40 text-amber-400 text-xs font-bold py-2 px-2 rounded border border-amber-500/30 flex flex-col items-center gap-1"
                            >
                                <Coins size={14} />
                                +1000 Gold/XP
                            </button>

                            <button 
                                onClick={handleReset}
                                className="bg-red-900/40 hover:bg-red-800/40 text-red-400 text-xs font-bold py-2 px-2 rounded border border-red-500/30 flex flex-col items-center gap-1"
                            >
                                <RotateCcw size={14} />
                                Сброс
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button 
                onClick={togglePanel}
                className={`p-3 rounded-full shadow-lg border transition-all duration-300 ${
                    isOpen
                        ? 'bg-amber-600 border-amber-400 text-white' 
                        : 'bg-slate-800 border-slate-600 text-slate-500 hover:text-amber-500'
                }`}
            >
                {isOpen ? <Unlock size={24} /> : <Settings size={24} />}
            </button>
        </div>
    );
};

export default AdminControls;
