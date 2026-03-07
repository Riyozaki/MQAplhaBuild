import React, { useState, useEffect, useCallback } from 'react';
import Modal from 'react-modal';
import { Quest, Task } from '../types';
import { X, Coins, Star, Trophy, Volume2, StopCircle, Play, Clock, Zap, Loader2, Lightbulb } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { startQuestAction, selectIsPending, checkAchievements } from '../store/userSlice';
import { completeQuestAction, markQuestCompleted, fetchQuests } from '../store/questsSlice';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { RootState, AppDispatch } from '../store';
import { useSoundEffects } from '../hooks/useSoundEffects';
import LoadingOverlay from './LoadingOverlay';
import { CATEGORY_TRANSLATIONS } from '../data/questTypes';

// Import task components
import QuizTask from './QuizTask';
import InputTask from './InputTask';
import TimerTask from './tasks/TimerTask';
import ChecklistTask from './tasks/ChecklistTask';
import OrderingTask from './tasks/OrderingTask';
import MatchingTask from './tasks/MatchingTask';
import YesNoTask from './tasks/YesNoTask';
import FillBlanksTask from './tasks/FillBlanksTask';
import DragToImageTask from './tasks/DragToImageTask';

interface QuestModalProps {
  quest: Quest | null;
  isOpen: boolean;
  onClose: () => void;
  multiplier?: number;
  locationId?: string;
}

interface TaskResult {
    isCorrect: boolean;
    isPartial: boolean;
}

// Max hints per quest (4 hints = 100% penalty = 0 reward)
const MAX_HINTS = 4;
const HINT_PENALTY = 0.25; // 25% per hint

// === FIX: Universal completion check (handles both string and numeric IDs) ===
const isQuestDoneToday = (questId: string | number, questHistory: any[]): boolean => {
    if (!questHistory || !Array.isArray(questHistory)) return false;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const qIdStr = String(questId);
    return questHistory.some((h: any) => 
        String(h.questId) === qIdStr && new Date(h.date) >= todayStart
    );
};

const getLocationModifier = (locId: string | undefined, category: string): { xp: number; coins: number; label?: string } => {
    switch(locId) {
        case 'forest': 
            if (category === 'science' || category === 'ecology') return { xp: 1.2, coins: 1.0, label: '🌲 Лес: +20% XP (Природа)' };
            return { xp: 1.0, coins: 1.0 };
        case 'mountains':
            return { xp: 1.0, coins: 1.2, label: '🏔️ Горы: +20% Золота' };
        case 'castle':
            return { xp: 1.1, coins: 1.1, label: '🏰 Замок: +10% Наград' };
        case 'desert':
            return { xp: 1.0, coins: 1.0 }; // Maybe harder?
        case 'throne':
            return { xp: 1.5, coins: 1.5, label: '👑 Трон: +50% Наград' };
        default: return { xp: 1.0, coins: 1.0 };
    }
};

const QuestModal: React.FC<QuestModalProps> = ({ quest, isOpen, onClose, multiplier = 1, locationId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.user.currentUser);
  const isCompleting = useSelector(selectIsPending('completeQuest'));
  
  // ... existing hooks ...

  const locMod = getLocationModifier(locationId, quest?.category || '');
  
  // ... existing logic ...

  // Apply location modifier to final multiplier
  // finalMultiplier = finalMultiplier * multiplier * hintPenaltyMultiplier * locMod.xp (for XP)
  // But completeQuestAction takes a single multiplier.
  // I might need to pass separate XP/Coin multipliers or just average them.
  // For simplicity, I'll apply the XP modifier to the main multiplier if it's significant, 
  // or just show it visually and calculate rewards locally for display.
  // The backend/reducer calculates rewards based on quest.xp * multiplier.
  // So I should pass the combined multiplier.
  
  // Let's use the XP modifier as the "main" modifier for the action, 
  // but this affects coins too if the reducer uses the same multiplier.
  // If I want separate, I need to update the reducer.
  // For now, I'll assume the multiplier affects both.
  
  const effectiveLocMod = Math.max(locMod.xp, locMod.coins);

  // ... inside handleCompleteFlow ...
  // finalMultiplier = finalMultiplier * multiplier * hintPenaltyMultiplier * effectiveLocMod;

  // ... inside render ...
  // const displayedCoins = Math.floor(displayQuest.coins * multiplier * hintPenaltyMultiplier * locMod.coins);
  // const displayedXp = Math.floor(displayQuest.xp * multiplier * hintPenaltyMultiplier * locMod.xp);

  const { playQuestComplete } = useSoundEffects();
  
  const [taskResults, setTaskResults] = useState<{ [key: string]: TaskResult }>({});
  const [completed, setCompleted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const loadVoices = () => {
      const vs = window.speechSynthesis.getVoices();
      setVoices(vs);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { 
        window.speechSynthesis.onvoiceschanged = null; 
        window.speechSynthesis.cancel();
    };
  }, []);
  
  // === HINT SYSTEM STATE ===
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintedTasks, setHintedTasks] = useState<Set<number | string>>(new Set());
  
  const isAdmin = user?.role === 'admin';

  // Hint reward penalty multiplier: 1 hint = 0.75, 2 = 0.50, 3 = 0.25, 4 = 0.00
  const hintPenaltyMultiplier = Math.max(0, 1 - (hintsUsed * HINT_PENALTY));

  useEffect(() => {
    if (!isOpen) {
      setTaskResults({});
      setCompleted(false);
      setHintsUsed(0);
      setHintedTasks(new Set());
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else if (quest && user?.questHistory) {
      // FIX: On open, check if this quest was already completed today
      // This prevents re-completion when the quest card incorrectly
      // appears as "not done" (e.g. due to ID type mismatch bugs)
      if (isQuestDoneToday(quest.id, user.questHistory)) {
        setCompleted(true);
      }
    }
  }, [isOpen, quest?.id]);

  // ... (cache restoration logic remains)

  const handleSpeak = () => {
    if (!quest) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const text = `${quest.title}. ${quest.description}.`;
      const utterance = new SpeechSynthesisUtterance(text);
      
      const ruVoice = voices.find(v => v.lang.includes('ru'));
      if (ruVoice) utterance.voice = ruVoice;
      utterance.lang = 'ru-RU';
      
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
          console.error("TTS Error:", e);
          setIsSpeaking(false);
          // Don't toast error to avoid spam if it's just a cancellation or missing voice
      };
      
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  // Restore cached progress with TTL cleanup
  useEffect(() => {
    if (quest && isOpen) {
      const now = Date.now();
      const TTL = 24 * 60 * 60 * 1000; // 24 hours

      // Cleanup old cache entries (Debounced or limited check)
      // Only check if we haven't checked recently (e.g., once per session load)
      if (!(window as any).__QUEST_CLEANUP_DONE__) {
          (window as any).__QUEST_CLEANUP_DONE__ = true;
          setTimeout(() => {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('quest_progress_') || key.startsWith('quest_hints_')) {
                    // Optional: Add logic to clear very old keys if needed
                }
            });
          }, 1000);
      }

      const cached = localStorage.getItem(`quest_progress_${quest.id}`);
      if (cached) {
        try { 
            const parsed = JSON.parse(cached);
            // Check for timestamp if we added one, otherwise assume valid for now
            if (parsed._timestamp && (now - parsed._timestamp > TTL)) {
                localStorage.removeItem(`quest_progress_${quest.id}`);
            } else {
                delete parsed._timestamp; // Remove metadata before setting state
                setTaskResults(parsed); 
            }
        } catch {}
      }
      
      const cachedHints = localStorage.getItem(`quest_hints_${quest.id}`);
      if (cachedHints) {
        try {
          const parsed = JSON.parse(cachedHints);
           if (parsed._timestamp && (now - parsed._timestamp > TTL)) {
                localStorage.removeItem(`quest_hints_${quest.id}`);
            } else {
                setHintsUsed(parsed.count || 0);
                setHintedTasks(new Set(parsed.taskIds || []));
            }
        } catch {}
      }
    }
  }, [quest, isOpen]);



  const formatTime = (ms: number) => {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTaskAnswer = useCallback((taskId: number | string, isCorrect: boolean, isPartial: boolean = false) => {
      setTaskResults(prev => {
          const newResults = { ...prev, [taskId]: { isCorrect, isPartial } };
          if (quest) {
              localStorage.setItem(`quest_progress_${quest.id}`, JSON.stringify({
                  ...newResults,
                  _timestamp: Date.now()
              }));
          }
          return newResults;
      });
  }, [quest]);

  // === HINT HANDLER ===
  const handleUseHint = useCallback((taskId: number | string) => {
      if (hintsUsed >= MAX_HINTS) {
          toast.warning("Подсказки закончились!");
          return false;
      }
      if (hintedTasks.has(taskId)) {
          toast.info("Подсказка уже использована для этого задания.");
          return false;
      }
      
      const newCount = hintsUsed + 1;
      const newHinted = new Set(hintedTasks);
      newHinted.add(taskId);
      
      setHintsUsed(newCount);
      setHintedTasks(newHinted);
      
      // Cache hints
      if (quest) {
          localStorage.setItem(`quest_hints_${quest.id}`, JSON.stringify({
              count: newCount,
              taskIds: Array.from(newHinted),
              _timestamp: Date.now()
          }));
      }
      
      const penalty = newCount * 25;
      toast.info(`💡 Подсказка! Награда снижена на ${penalty}%`, { icon: () => "💡" });
      return true;
  }, [hintsUsed, hintedTasks, quest]);

  const isTaskHinted = useCallback((taskId: number | string) => {
      return hintedTasks.has(taskId);
  }, [hintedTasks]);

  // === RENDER TASKS WITH HINT SUPPORT ===
  const renderTask = (task: Task) => {
      const hintProps = {
          onHint: handleUseHint,
          isHinted: isTaskHinted(task.id),
          hintsRemaining: MAX_HINTS - hintsUsed,
      };

      switch (task.type) {
        case 'quiz': return <QuizTask key={task.id} task={task} onAnswer={handleTaskAnswer} {...hintProps} />;
        case 'text_input':
        case 'number_input': return <InputTask key={task.id} task={task} onAnswer={handleTaskAnswer} {...hintProps} />;
        case 'timer_challenge': return <TimerTask key={task.id} task={task} onAnswer={handleTaskAnswer} />;
        case 'checklist': return <ChecklistTask key={task.id} task={task} onAnswer={handleTaskAnswer} />;
        case 'ordering': return <OrderingTask key={task.id} task={task} onAnswer={handleTaskAnswer} {...hintProps} />;
        case 'matching': return <MatchingTask key={task.id} task={task} onAnswer={handleTaskAnswer} {...hintProps} />;
        case 'fill_blanks': return <FillBlanksTask key={task.id} task={task} onComplete={(isCorrect) => handleTaskAnswer(task.id, isCorrect)} />;
        case 'drag_to_image': return <DragToImageTask key={task.id} task={task} onComplete={(isCorrect) => handleTaskAnswer(task.id, isCorrect)} />;
        case 'yes_no':
        default: return <YesNoTask key={task.id} task={task} onAnswer={handleTaskAnswer} />;
      }
  };

  const handleCompleteFlow = async () => {
      if (!quest || isCompleting) return;

      // FIX: Double-completion guard
      // Check LIVE state (not just local `completed` flag) to prevent
      // earning rewards twice if the quest somehow appears as available
      if (user?.questHistory && isQuestDoneToday(quest.id, user.questHistory)) {
          toast.warning("Этот квест уже выполнен сегодня!");
          setCompleted(true);
          return;
      }

      const allTasks = quest.tasks;
      const completedCount = Object.keys(taskResults).length;
      
      if (completedCount < allTasks.length && !isAdmin) {
          toast.info("Выполни все части задания!");
          return;
      }

      let totalScore = 0;
      Object.values(taskResults).forEach((res: TaskResult) => {
          if (res.isCorrect) totalScore += 1;
          else if (res.isPartial) totalScore += 0.5;
      });

      let finalMultiplier = allTasks.length > 0 ? totalScore / allTasks.length : 1;

      if (isAdmin && completedCount < allTasks.length) {
          finalMultiplier = 1.0;
      }

      if (finalMultiplier === 0 && !isAdmin) {
          toast.error("Ты провалил все задания. Попробуй снова!");
          return;
      }

      // Recalculate modifiers here to ensure freshness
      const currentLocMod = getLocationModifier(locationId, quest.category);
      const currentEffectiveLocMod = Math.max(currentLocMod.xp, currentLocMod.coins);

      // Apply hint penalty and boost multiplier AND location modifier
      finalMultiplier = finalMultiplier * multiplier * hintPenaltyMultiplier * currentEffectiveLocMod;

      try {
          await dispatch(completeQuestAction({ quest, multiplier: finalMultiplier })).unwrap();
          
          // Clear cached progress & hints on success
          localStorage.removeItem(`quest_progress_${quest.id}`);
          localStorage.removeItem(`quest_hints_${quest.id}`);

          setCompleted(true);
          dispatch(markQuestCompleted(quest.id));
          dispatch(checkAchievements());
          
          // Delay server fetch to avoid race condition
          setTimeout(() => {
              dispatch(fetchQuests());
          }, 3000);
          
          if (hintsUsed > 0) {
              toast.info(`Использовано подсказок: ${hintsUsed} (−${hintsUsed * 25}% награды)`);
          }
          if (finalMultiplier >= 1.0) {
              toast.success(`Успех! Бонус: x${multiplier}`);
          }
      } catch (error: any) {
          console.error("Completion failed", error);
          toast.error(typeof error === 'string' ? error : (error.message || "Ошибка выполнения квеста."));
      }
  };

  const [cachedQuest, setCachedQuest] = useState<Quest | null>(quest);
  useEffect(() => {
      if (quest) setCachedQuest(quest);
  }, [quest]);

  const displayQuest = quest || cachedQuest;
  if (!displayQuest) return null;

  // Calculate displayed rewards with hint penalty and location modifier
  const displayedCoins = Math.floor(displayQuest.coins * multiplier * hintPenaltyMultiplier * locMod.coins);
  const displayedXp = Math.floor(displayQuest.xp * multiplier * hintPenaltyMultiplier * locMod.xp);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={!isCompleting ? onClose : undefined}
      contentLabel={displayQuest.title}
      role="dialog"
      shouldCloseOnOverlayClick={!isCompleting}
      shouldCloseOnEsc={!isCompleting}
      className="outline-none focus:outline-none"
      style={{
        overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px'
        },
        content: {
            position: 'relative',
            inset: 'auto',
            border: 'none',
            background: 'transparent',
            padding: 0,
            maxWidth: '650px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
        }
      }}
    >
      <LoadingOverlay isLoading={isCompleting} message="Синхронизация..." className="rounded-2xl">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative bg-[#1a1625] border-2 border-slate-600/50 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col w-full max-h-[90vh]"
      >
        {/* Glow Border */}
        <div className="absolute inset-0 pointer-events-none rounded-2xl border-2 border-purple-500/20 box-border z-20"></div>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 via-slate-900 to-slate-900 p-4 md:p-6 relative border-b border-white/10 shrink-0">
             <button 
                disabled={isCompleting} 
                onClick={onClose} 
                aria-label="Закрыть квест"
                className="absolute top-4 right-4 z-30 p-2 bg-slate-800/50 rounded-full text-white/50 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-purple-500 outline-none"
             >
                 <X size={20} />
             </button>
             
             <div className="flex flex-wrap items-center gap-2 mb-2 pr-8">
                 <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">
                     {CATEGORY_TRANSLATIONS[displayQuest.category]?.icon} {CATEGORY_TRANSLATIONS[displayQuest.category]?.label || displayQuest.category}
                 </span>
                 <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">{displayQuest.rarity}</span>
                 {multiplier > 1 && (
                     <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center">
                         <Zap size={10} className="mr-1" /> x{multiplier} BOOST
                     </span>
                 )}
                 {locMod.label && (
                     <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center">
                         {locMod.label}
                     </span>
                 )}
             </div>
             
             <h2 className="text-xl md:text-2xl font-bold text-white rpg-font">{displayQuest.title}</h2>
             <p className="text-slate-400 text-sm mt-1">{displayQuest.description}</p>
             
             {/* TTS */}
             <button 
                onClick={handleSpeak}
                className="mt-2 text-slate-500 hover:text-white transition-colors"
                aria-label={isSpeaking ? "Остановить" : "Озвучить"}
             >
                {isSpeaking ? <StopCircle size={18} /> : <Volume2 size={18} />}
             </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto flex-1 p-4 md:p-6">
            <AnimatePresence mode="wait">
            {completed ? (
              <motion.div key="completed" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
                  <Trophy className="mx-auto mb-4 text-amber-400" size={60} />
                  <h3 className="text-2xl font-bold text-white rpg-font mb-2">Квест Выполнен!</h3>
                  <p className="text-slate-400 mb-6">Награда получена!</p>
                  
                  <div className="flex justify-center gap-4 md:gap-6 mb-4">
                      <div className="bg-slate-800/80 px-4 md:px-6 py-3 rounded-xl border border-amber-500/30 flex items-center shadow-lg">
                          <Coins className="text-amber-400 mr-2 h-5 w-5 md:h-6 md:w-6" />
                          <span className="font-bold text-lg md:text-xl text-white">+{displayedCoins}</span>
                      </div>
                      <div className="bg-slate-800/80 px-4 md:px-6 py-3 rounded-xl border border-purple-500/30 flex items-center shadow-lg">
                          <Star className="text-purple-400 mr-2 h-5 w-5 md:h-6 md:w-6" />
                          <span className="font-bold text-lg md:text-xl text-white">+{displayedXp}</span>
                      </div>
                  </div>

                  {hintsUsed > 0 && (
                      <p className="text-amber-400/70 text-sm mb-6">
                          💡 Подсказок использовано: {hintsUsed} (−{hintsUsed * 25}% награды)
                      </p>
                  )}

                  <button 
                    disabled={isCompleting} 
                    onClick={onClose} 
                    className="w-full py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors font-bold disabled:opacity-50 focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                      Закрыть Свиток
                  </button>
              </motion.div>
            ) : (
              <motion.div key="tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                     {/* Hint Penalty Indicator */}
                     {hintsUsed > 0 && (
                         <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between">
                             <div className="flex items-center gap-2 text-amber-400 text-sm">
                                 <Lightbulb size={16} />
                                 <span>Подсказок: {hintsUsed}/{MAX_HINTS}</span>
                             </div>
                             <div className="text-sm">
                                 <span className="text-slate-400">Награда: </span>
                                 <span className={`font-bold ${hintPenaltyMultiplier < 0.5 ? 'text-red-400' : hintPenaltyMultiplier < 1 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                     {Math.round(hintPenaltyMultiplier * 100)}%
                                 </span>
                             </div>
                         </div>
                     )}
                     <div className="space-y-6 pointer-events-auto">
                        {displayQuest.tasks?.map(task => renderTask(task))}
                     </div>
              </motion.div>
            )}
            </AnimatePresence>
        </div>

        {/* Footer */}
        {!completed && (
            <div className="p-4 md:p-6 bg-slate-900 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                <div className="flex gap-4 text-sm font-bold w-full md:w-auto justify-center md:justify-start">
                    <span className={`flex items-center ${hintsUsed > 0 ? 'text-amber-400/70' : 'text-amber-400'}`}>
                        <Coins className="h-4 w-4 mr-1" /> {displayedCoins}
                        {hintsUsed > 0 && <span className="text-red-400 text-xs ml-1">(-{hintsUsed * 25}%)</span>}
                    </span>
                    <span className={`flex items-center ${hintsUsed > 0 ? 'text-purple-400/70' : 'text-purple-400'}`}>
                        <Star className="h-4 w-4 mr-1" /> {displayedXp}
                    </span>
                </div>
                <button 
                   onClick={handleCompleteFlow} 
                   disabled={isCompleting}
                   aria-label="Завершить квест и получить награду"
                   className={`w-full md:w-auto px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg flex items-center justify-center gap-2 focus:ring-2 focus:ring-purple-500 outline-none
                       ${isCompleting
                           ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                           : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:shadow-emerald-600/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
                       }
                   `}
                >
                    {isCompleting ? (
                        <><Loader2 className="animate-spin" size={16} /> Отправка...</>
                    ) : (
                        'Завершить Квест'
                    )}
                </button>
            </div>
        )}
      </motion.div>
      </LoadingOverlay>
    </Modal>
  );
};

export default QuestModal;
