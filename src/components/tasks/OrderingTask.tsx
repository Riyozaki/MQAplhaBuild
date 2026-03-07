
import React, { useState, useEffect } from 'react';
import { Task } from '../../types';
import { ArrowUp, ArrowDown, Check } from 'lucide-react';

interface Props {
    task: Task;
    onAnswer: (taskId: number | string, isCorrect: boolean) => void;
    isHinted?: boolean;
    onHint?: (taskId: number | string) => boolean;
    hintsRemaining?: number;
}

const OrderingTask: React.FC<Props> = ({ task, onAnswer, isHinted, onHint, hintsRemaining }) => {
    // Use seeded shuffle to ensure consistent order across reloads for the same task
    const [items, setItems] = useState<string[]>(() => {
        if (task.shuffledItems && task.shuffledItems.length > 0) {
            return task.shuffledItems;
        }
        if (task.correctOrder) {
            // Simple seeded shuffle based on task ID to ensure consistency
            const seed = String(task.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const array = [...task.correctOrder];
            
            let m = array.length, t, i;
            const random = () => {
                const x = Math.sin(seed + m) * 10000;
                return x - Math.floor(x);
            };

            while (m) {
                i = Math.floor(random() * m--);
                t = array[m];
                array[m] = array[i];
                array[i] = t;
            }
            return array;
        }
        return [];
    });

    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);

    const move = (idx: number, dir: -1 | 1) => {
        if (isSubmitted) return;
        const newItems = [...items];
        const temp = newItems[idx];
        newItems[idx] = newItems[idx + dir];
        newItems[idx + dir] = temp;
        setItems(newItems);
    };

    const submit = () => {
        setIsSubmitted(true);
        const correct = JSON.stringify(items) === JSON.stringify(task.correctOrder);
        setIsCorrect(correct);
        onAnswer(task.id, correct);
    };

    return (
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <div className="flex justify-between items-start mb-4">
                <h4 className="font-bold text-white text-lg">{task.question}</h4>
                {onHint && !isSubmitted && (
                    <button 
                        onClick={() => onHint(task.id)}
                        disabled={isHinted || (hintsRemaining !== undefined && hintsRemaining <= 0)}
                        className={`text-xs px-2 py-1 rounded border ${isHinted ? 'border-slate-600 text-slate-500' : 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10'}`}
                    >
                        {isHinted ? 'Подсказка использована' : '💡 Подсказка'}
                    </button>
                )}
            </div>
            
            {isHinted && task.correctOrder && (
                <div className="mb-4 p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg text-sm text-amber-200">
                    <span className="font-bold">Первый элемент:</span> {task.correctOrder[0]}
                </div>
            )}

            <div className="space-y-2 mb-4">
                {items.map((item, idx) => (
                    <div key={idx} className="bg-slate-900 p-3 rounded-lg border border-slate-600 flex justify-between items-center">
                        <span className="text-slate-200">{item}</span>
                        {!isSubmitted && (
                            <div className="flex gap-1">
                                <button disabled={idx === 0} onClick={() => move(idx, -1)} className="p-1 hover:bg-slate-700 rounded disabled:opacity-30"><ArrowUp size={16} /></button>
                                <button disabled={idx === items.length - 1} onClick={() => move(idx, 1)} className="p-1 hover:bg-slate-700 rounded disabled:opacity-30"><ArrowDown size={16} /></button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {!isSubmitted ? (
                <button onClick={submit} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl">
                    Проверить Порядок
                </button>
            ) : (
                <div className={`p-3 rounded border-l-4 text-sm ${isCorrect ? 'bg-emerald-900/20 border-emerald-500 text-emerald-300' : 'bg-red-900/20 border-red-500 text-red-300'}`}>
                    {isCorrect ? 'Верный порядок!' : 'Неверно. Попробуй еще раз в следующий раз.'}
                </div>
            )}
        </div>
    );
};

export default OrderingTask;
