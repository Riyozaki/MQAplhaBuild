import React, { useState, useEffect, useRef, useMemo } from 'react';
import Modal from 'react-modal';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, Crown, AlertCircle, Heart, Zap, Sword, Battery, Loader2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { selectIsPending, finishCampaign } from '../store/userSlice';
import { fireConfetti } from '../utils/confetti';
import LoadingOverlay from './LoadingOverlay';
import { GradeGroup } from '../types';
import { grade5QuestTasksMap } from '../data/grade5QuestTasks';
import { grade67QuestTasksMap } from '../data/grade67QuestTasks';
import { grade89QuestTasksMap } from '../data/grade89QuestTasks';
import { grade1011QuestTasksMap } from '../data/grade1011QuestTasks';

const FALLBACK_QUESTIONS = [
  // MATH
  { q: "9 × 7 = ?", opts: ["63","56","72","81"], correct: 0, cat: "math", dmg: 25 },
  { q: "√169 = ?", opts: ["13","11","12","14"], correct: 0, cat: "math", dmg: 30 },
  // ... (keep a few fallbacks)
];

interface BossBattleModalProps {
    isOpen: boolean;
    onClose: () => void;
    allies: string[];
    gradeGroup?: GradeGroup;
}

interface Question {
    q: string;
    opts: string[];
    correct: number;
    cat: string;
    dmg: number;
}

const getBossQuestions = (grade: GradeGroup = 'grade5'): Question[] => {
    let map: Record<string, any[]>;
    switch(grade) {
        case 'grade5': map = grade5QuestTasksMap; break;
        case 'grade67': map = grade67QuestTasksMap; break;
        case 'grade89': map = grade89QuestTasksMap; break;
        case 'grade1011': map = grade1011QuestTasksMap; break;
        default: map = grade5QuestTasksMap;
    }

    const questions: Question[] = [];
    Object.values(map).forEach(tasks => {
        tasks.forEach(t => {
            if (t.type === 'quiz' && t.options && t.options.length >= 2) {
                questions.push({
                    q: t.question,
                    opts: t.options,
                    correct: t.correctIndex || 0,
                    cat: 'general',
                    dmg: 25 + Math.floor(Math.random() * 15) // Random dmg 25-40
                });
            }
        });
    });
    
    if (questions.length < 10) return FALLBACK_QUESTIONS;
    
    // Shuffle and pick 20
    return questions.sort(() => Math.random() - 0.5).slice(0, 20);
};

const BossBattleModal: React.FC<BossBattleModalProps> = ({ isOpen, onClose, allies, gradeGroup }) => {
    const dispatch = useDispatch<AppDispatch>();
    const isPending = useSelector(selectIsPending('bossBattle'));
    
    // Stats
    const maxPlayerHp = 150;
    const maxBossHp = 400;
    
    // Refs for logic (prevent stale closures in timeouts)
    const playerHpRef = useRef(maxPlayerHp);
    const bossHpRef = useRef(maxBossHp);

    // State for UI rendering
    const [playerHp, setPlayerHp] = useState(maxPlayerHp);
    const [bossHp, setBossHp] = useState(maxBossHp);
    
    const [turn, setTurn] = useState<'player' | 'boss' | 'win' | 'lose'>('player');
    const [logs, setLogs] = useState<string[]>([]);
    
    // Ally Charges: Wizard (2), Fairy (1), Warrior (1)
    const [allyCharges, setAllyCharges] = useState<{ [key: string]: number }>({
        wizard: 2,
        fairy: 1,
        warrior: 1
    });
    
    // Question State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQ, setCurrentQ] = useState<Question | null>(null);
    const [disabledOpts, setDisabledOpts] = useState<number[]>([]);
    const [dmgMultiplier, setDmgMultiplier] = useState(1);
    
    // Visuals
    const [bossFlash, setBossFlash] = useState(false);
    const [playerFlash, setPlayerFlash] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const qs = getBossQuestions(gradeGroup);
            setQuestions(qs);
            resetBattle();
            // Pick first question immediately
            const idx = Math.floor(Math.random() * qs.length);
            setCurrentQ(qs[idx]);
        }
    }, [isOpen, gradeGroup]);

    const resetBattle = () => {
        playerHpRef.current = maxPlayerHp;
        bossHpRef.current = maxBossHp;
        setPlayerHp(maxPlayerHp);
        setBossHp(maxBossHp);
        setTurn('player');
        setLogs(["Король Лени: 'Докажи, что твои знания чего-то стоят!'"]);
        setDisabledOpts([]);
        setDmgMultiplier(1);
        setBossFlash(false);
        setPlayerFlash(false);
        setAllyCharges({ wizard: 2, fairy: 1, warrior: 1 });
    };

    const nextQuestion = () => {
        if (questions.length === 0) return;
        const idx = Math.floor(Math.random() * questions.length);
        setCurrentQ(questions[idx]);
        setDisabledOpts([]);
    };

    const handleAnswer = (idx: number) => {
        if (turn !== 'player' || !currentQ || isPending) return;

        if (idx === currentQ.correct) {
            // Correct
            const dmg = Math.floor(currentQ.dmg * dmgMultiplier);
            
            // Update Ref Logic
            const newBossHp = Math.max(0, bossHpRef.current - dmg);
            bossHpRef.current = newBossHp;
            
            // Sync UI
            setBossHp(newBossHp);
            
            setBossFlash(true);
            setTimeout(() => setBossFlash(false), 200);
            setLogs(prev => [`Вы нанесли ${dmg} урона знаниями!`, ...prev].slice(0, 4));
            setDmgMultiplier(1); // Reset multiplier
            
            if (newBossHp <= 0) {
                setTurn('win');
                fireConfetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
            } else {
                setTurn('boss');
                setTimeout(bossTurn, 1500);
            }
        } else {
            // Incorrect
            setLogs(prev => [`Ошибка! Правильно: ${currentQ.opts[currentQ.correct]}`, ...prev].slice(0, 4));
            setTurn('boss');
            setTimeout(bossTurn, 1500);
        }
    };

    const bossTurn = () => {
        const dmg = Math.floor(Math.random() * 20) + 15;
        
        // Update Ref Logic
        const newPlayerHp = Math.max(0, playerHpRef.current - dmg);
        playerHpRef.current = newPlayerHp;
        
        // Sync UI
        setPlayerHp(newPlayerHp);
        
        setPlayerFlash(true);
        setTimeout(() => setPlayerFlash(false), 200);
        setLogs(prev => [`Король Лени атакует! -${dmg} HP`, ...prev].slice(0, 4));
        
        if (newPlayerHp <= 0) {
            setTurn('lose');
        } else {
            setTurn('player');
            nextQuestion();
        }
    };

    // Ally Abilities
    const useAlly = (ally: string) => {
        if (!currentQ || turn !== 'player' || isPending) return;
        if (allyCharges[ally] <= 0) return;

        // Decrement charge
        setAllyCharges(prev => ({ ...prev, [ally]: prev[ally] - 1 }));

        if (ally === 'wizard') {
            // Remove 1 wrong option
            const wrongOpts = currentQ.opts.map((_, i) => i).filter(i => i !== currentQ.correct && !disabledOpts.includes(i));
            if (wrongOpts.length > 0) {
                const toRemove = wrongOpts[Math.floor(Math.random() * wrongOpts.length)];
                setDisabledOpts(prev => [...prev, toRemove]);
                setLogs(prev => [`🧙‍♂️ Волшебник убрал неверный вариант! (Ост: ${allyCharges['wizard'] - 1})`, ...prev].slice(0, 4));
            }
        }
        if (ally === 'fairy') {
            const newHp = Math.min(maxPlayerHp, playerHpRef.current + 30);
            playerHpRef.current = newHp;
            setPlayerHp(newHp);
            setLogs(prev => [`🧚‍♀️ Фея восстановила 30 HP! (Ост: ${allyCharges['fairy'] - 1})`, ...prev].slice(0, 4));
        }
        if (ally === 'warrior') {
            setDmgMultiplier(2);
            setLogs(prev => [`🛡️ Воин: Следующий удар нанесет двойной урон! (Ост: ${allyCharges['warrior'] - 1})`, ...prev].slice(0, 4));
        }
    };

    const handleVictory = () => {
        if (isPending) return;
        dispatch(finishCampaign()).then(() => onClose());
    };

    return (
        <Modal
            isOpen={isOpen}
            className="outline-none focus:outline-none"
            style={{
                overlay: { backgroundColor: 'rgba(0, 0, 0, 0.95)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
                content: { position: 'relative', inset: 'auto', border: 'none', background: 'transparent', padding: 0, width: '100%', maxWidth: '700px' }
            }}
        >
            <LoadingOverlay isLoading={isPending} message="Запись победы..." className="rounded-3xl">
            <div className="relative w-full bg-slate-900 border-2 border-slate-700 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                {/* Visuals */}
                <div className={`relative h-64 bg-slate-900 flex justify-between items-end p-8 transition-colors ${playerFlash ? 'bg-red-900/50' : ''}`}>
                     <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-black opacity-80"></div>
                     
                     {/* Player */}
                     <div className="relative z-10">
                        <div className="w-32">
                            <div className="flex justify-between text-xs font-bold text-emerald-400 mb-1">
                                <span>Герой</span>
                                <span>{playerHp}/{maxPlayerHp}</span>
                            </div>
                            <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
                                <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${(playerHp/maxPlayerHp)*100}%` }}></div>
                            </div>
                        </div>
                     </div>

                     {/* Boss */}
                     <div className="relative z-10 flex flex-col items-center">
                         <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center shadow-[0_0_40px_rgba(220,38,38,0.4)] transition-all ${bossFlash ? 'bg-red-500 scale-110' : 'bg-slate-800 border-red-900'}`}>
                             <Skull size={64} className="text-red-500" />
                         </div>
                         <div className="w-48 mt-4">
                            <div className="flex justify-between text-xs font-bold text-red-400 mb-1">
                                <span>Король Лени</span>
                                <span>{bossHp}/{maxBossHp}</span>
                            </div>
                            <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
                                <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${(bossHp/maxBossHp)*100}%` }}></div>
                            </div>
                        </div>
                     </div>
                </div>

                {/* Controls */}
                <div className="bg-slate-950 p-6 border-t border-slate-800 min-h-[300px]">
                     {/* Logs */}
                     <div className="h-16 overflow-y-auto mb-4 bg-black/30 rounded p-2 text-xs font-mono text-slate-400">
                         {logs.map((l, i) => <div key={i}>{'>'} {l}</div>)}
                     </div>

                     {turn === 'player' && currentQ ? (
                         <div>
                             <h3 className="text-white font-bold text-lg mb-4 text-center">{currentQ.q}</h3>
                             <div className="grid grid-cols-2 gap-3 mb-6">
                                 {currentQ.opts.map((opt, idx) => (
                                     <button
                                        key={idx}
                                        onClick={() => handleAnswer(idx)}
                                        disabled={disabledOpts.includes(idx) || isPending}
                                        className={`p-3 rounded-xl border-2 font-bold transition-all ${disabledOpts.includes(idx) ? 'bg-slate-900 border-slate-800 text-slate-700 opacity-50' : 'bg-slate-800 border-slate-700 hover:border-purple-500 text-white disabled:opacity-50'}`}
                                     >
                                         {opt}
                                     </button>
                                 ))}
                             </div>

                             {/* Allies */}
                             <div className="flex justify-center gap-4 border-t border-slate-800 pt-4">
                                 {allies.includes('wizard') && (
                                     <button 
                                        onClick={() => useAlly('wizard')} 
                                        disabled={allyCharges['wizard'] <= 0 || isPending}
                                        className={`flex flex-col items-center group ${allyCharges['wizard'] <= 0 ? 'opacity-30 cursor-not-allowed' : 'text-purple-400 hover:text-white'}`}
                                     >
                                         <div className="p-2 bg-purple-900/30 rounded-lg border border-purple-500/50 mb-1 relative">
                                             <Zap size={20}/>
                                             <span className="absolute -top-2 -right-2 bg-black text-xs rounded-full w-5 h-5 flex items-center justify-center border border-slate-700">{allyCharges['wizard']}</span>
                                         </div>
                                         <span className="text-[10px] font-bold">50/50</span>
                                     </button>
                                 )}
                                 {allies.includes('fairy') && (
                                     <button 
                                        onClick={() => useAlly('fairy')}
                                        disabled={allyCharges['fairy'] <= 0 || isPending} 
                                        className={`flex flex-col items-center group ${allyCharges['fairy'] <= 0 ? 'opacity-30 cursor-not-allowed' : 'text-pink-400 hover:text-white'}`}
                                     >
                                         <div className="p-2 bg-pink-900/30 rounded-lg border border-pink-500/50 mb-1 relative">
                                             <Heart size={20}/>
                                             <span className="absolute -top-2 -right-2 bg-black text-xs rounded-full w-5 h-5 flex items-center justify-center border border-slate-700">{allyCharges['fairy']}</span>
                                         </div>
                                         <span className="text-[10px] font-bold">Heal</span>
                                     </button>
                                 )}
                                 {allies.includes('warrior') && (
                                     <button 
                                        onClick={() => useAlly('warrior')} 
                                        disabled={allyCharges['warrior'] <= 0 || isPending}
                                        className={`flex flex-col items-center group ${allyCharges['warrior'] <= 0 ? 'opacity-30 cursor-not-allowed' : 'text-red-400 hover:text-white'}`}
                                     >
                                         <div className="p-2 bg-red-900/30 rounded-lg border border-red-500/50 mb-1 relative">
                                             <Sword size={20}/>
                                             <span className="absolute -top-2 -right-2 bg-black text-xs rounded-full w-5 h-5 flex items-center justify-center border border-slate-700">{allyCharges['warrior']}</span>
                                         </div>
                                         <span className="text-[10px] font-bold">x2 Dmg</span>
                                     </button>
                                 )}
                             </div>
                         </div>
                     ) : turn === 'boss' ? (
                         <div className="text-center text-red-400 py-10 animate-pulse font-bold text-xl">
                             <AlertCircle className="mx-auto mb-2" />
                             Босс атакует...
                         </div>
                     ) : turn === 'win' ? (
                         <div className="text-center py-6">
                             <Crown size={48} className="text-amber-400 mx-auto mb-4" />
                             <h2 className="text-3xl font-black text-white mb-4">ПОБЕДА!</h2>
                             <button onClick={handleVictory} disabled={isPending} className="bg-amber-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center mx-auto gap-2 disabled:opacity-50">
                                 {isPending ? <Loader2 className="animate-spin"/> : 'Завершить'}
                             </button>
                         </div>
                     ) : (
                         <div className="text-center py-6">
                             <Skull size={48} className="text-slate-500 mx-auto mb-4" />
                             <h2 className="text-3xl font-black text-white mb-4">ПОРАЖЕНИЕ</h2>
                             <button onClick={resetBattle} className="bg-slate-700 text-white px-8 py-3 rounded-xl font-bold">Попробовать снова</button>
                         </div>
                     )}
                </div>
            </div>
            </LoadingOverlay>
        </Modal>
    );
};

export default BossBattleModal;