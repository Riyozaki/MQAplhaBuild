import React, { useState, useEffect } from 'react';
import { Task } from '../../types';
import { Check, X } from 'lucide-react';

interface FillBlanksTaskProps {
    task: Task;
    onComplete: (isCorrect: boolean) => void;
}

const FillBlanksTask: React.FC<FillBlanksTaskProps> = ({ task, onComplete }) => {
    const [inputs, setInputs] = useState<string[]>([]);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [feedback, setFeedback] = useState<boolean[]>([]);

    const parts = task.textWithBlanks?.split('___') || [];
    const answers = task.blankAnswers || [];

    useEffect(() => {
        setInputs(new Array(answers.length).fill(''));
        setIsSubmitted(false);
        setFeedback([]);
    }, [task]);

    const handleChange = (index: number, value: string) => {
        const newInputs = [...inputs];
        newInputs[index] = value;
        setInputs(newInputs);
    };

    const checkAnswers = () => {
        const newFeedback = inputs.map((input, i) => 
            input.trim().toLowerCase() === answers[i]?.trim().toLowerCase()
        );
        setFeedback(newFeedback);
        setIsSubmitted(true);

        const allCorrect = newFeedback.every(Boolean);
        if (allCorrect) {
            setTimeout(() => onComplete(true), 1500);
        } else {
            setTimeout(() => {
                setIsSubmitted(false);
                onComplete(false);
            }, 2000);
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-white mb-4">{task.question}</h3>
            
            <div className="bg-slate-800/50 p-6 rounded-2xl leading-loose text-lg text-slate-200">
                {parts.map((part, i) => (
                    <React.Fragment key={i}>
                        <span>{part}</span>
                        {i < parts.length - 1 && (
                            <span className="inline-block mx-1 relative">
                                <input
                                    type="text"
                                    value={inputs[i]}
                                    onChange={(e) => handleChange(i, e.target.value)}
                                    disabled={isSubmitted}
                                    className={`w-32 bg-slate-900 border-b-2 px-2 py-1 text-center outline-none transition-colors ${
                                        isSubmitted 
                                            ? feedback[i] 
                                                ? 'border-emerald-500 text-emerald-400' 
                                                : 'border-red-500 text-red-400'
                                            : 'border-slate-600 focus:border-primary-500 text-white'
                                    }`}
                                    placeholder="..."
                                />
                                {isSubmitted && (
                                    <span className="absolute -top-3 -right-3">
                                        {feedback[i] ? <Check size={14} className="text-emerald-500" /> : <X size={14} className="text-red-500" />}
                                    </span>
                                )}
                            </span>
                        )}
                    </React.Fragment>
                ))}
            </div>

            <button
                onClick={checkAnswers}
                disabled={isSubmitted || inputs.some(i => !i.trim())}
                className="w-full py-4 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-primary-600/20"
            >
                {isSubmitted ? 'Проверка...' : 'Проверить'}
            </button>
        </div>
    );
};

export default FillBlanksTask;
