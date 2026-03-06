import React, { useState, useRef, useEffect } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { Task } from '../../types';
import { CheckCircle, XCircle } from 'lucide-react';

interface DragToImageTaskProps {
    task: Task;
    onComplete: (isCorrect: boolean) => void;
}

const DragToImageTask: React.FC<DragToImageTaskProps> = ({ task, onComplete }) => {
    const [placedItems, setPlacedItems] = useState<{ [itemId: string]: string }>({}); // itemId -> zoneId
    const [isSubmitted, setIsSubmitted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleDragEnd = (itemId: string, info: any) => {
        if (isSubmitted) return;
        
        // Simple collision detection based on pointer event or visual estimation
        // Since we can't easily get drop zone rects relative to viewport here without refs for each zone
        // We will use a simpler "click to place" fallback if drag is too complex, 
        // BUT let's try to use the mouse/touch position.
        
        const dropZones = task.dropZones || [];
        const containerRect = containerRef.current?.getBoundingClientRect();
        
        if (!containerRect) return;

        const x = info.point.x - containerRect.left;
        const y = info.point.y - containerRect.top;
        
        // Normalize to percentage
        const xPct = (x / containerRect.width) * 100;
        const yPct = (y / containerRect.height) * 100;

        // Find matching zone
        const zone = dropZones.find(z => {
            const zx = z.x;
            const zy = z.y;
            const w = z.width || 15; // default 15%
            const h = z.height || 15; // default 15%
            return xPct >= zx && xPct <= zx + w && yPct >= zy && yPct <= zy + h;
        });

        if (zone) {
            setPlacedItems(prev => ({ ...prev, [itemId]: zone.id }));
        } else {
             // Remove from zone if dropped outside
            const newPlaced = { ...placedItems };
            delete newPlaced[itemId];
            setPlacedItems(newPlaced);
        }
    };

    const checkAnswers = () => {
        const correctMapping = task.dragItems?.every(item => {
            const placedZoneId = placedItems[item.id];
            return placedZoneId === item.correctZoneId;
        });

        setIsSubmitted(true);
        if (correctMapping) {
            setTimeout(() => onComplete(true), 1500);
        } else {
            setTimeout(() => {
                setIsSubmitted(false);
                setPlacedItems({});
                onComplete(false);
            }, 2000);
        }
    };

    return (
        <div className="space-y-6 select-none">
            <h3 className="text-xl font-bold text-white mb-4">{task.question}</h3>
            
            <div 
                ref={containerRef}
                className="relative w-full aspect-video bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 shadow-inner"
            >
                {task.imageUrl ? (
                    <img src={task.imageUrl} alt="Task" className="w-full h-full object-cover opacity-50" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">No Image</div>
                )}

                {/* Drop Zones */}
                {task.dropZones?.map(zone => (
                    <div
                        key={zone.id}
                        className={`absolute border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${
                            Object.values(placedItems).includes(zone.id) 
                                ? 'border-primary-400 bg-primary-500/20' 
                                : 'border-slate-500/50 bg-slate-900/30'
                        }`}
                        style={{
                            left: `${zone.x}%`,
                            top: `${zone.y}%`,
                            width: `${zone.width || 15}%`,
                            height: `${zone.height || 15}%`
                        }}
                    >
                        {zone.label && <span className="text-xs text-slate-400 font-bold">{zone.label}</span>}
                    </div>
                ))}

                {/* Placed Items (Rendered inside zones) */}
                {task.dragItems?.map(item => {
                    const zoneId = placedItems[item.id];
                    if (!zoneId) return null;
                    
                    const zone = task.dropZones?.find(z => z.id === zoneId);
                    if (!zone) return null;

                    return (
                        <motion.div
                            key={`placed-${item.id}`}
                            layoutId={item.id}
                            className={`absolute z-20 px-3 py-1 bg-primary-600 text-white text-xs font-bold rounded-full shadow-lg cursor-grab active:cursor-grabbing flex items-center gap-1
                                ${isSubmitted 
                                    ? item.correctZoneId === zoneId 
                                        ? 'bg-emerald-500' 
                                        : 'bg-red-500'
                                    : ''
                                }
                            `}
                            style={{
                                left: `${zone.x + (zone.width || 15)/2}%`,
                                top: `${zone.y + (zone.height || 15)/2}%`,
                                x: '-50%',
                                y: '-50%'
                            }}
                            onClick={() => {
                                if (!isSubmitted) {
                                    const newPlaced = { ...placedItems };
                                    delete newPlaced[item.id];
                                    setPlacedItems(newPlaced);
                                }
                            }}
                        >
                            {item.label}
                            {isSubmitted && (
                                item.correctZoneId === zoneId 
                                    ? <CheckCircle size={12} /> 
                                    : <XCircle size={12} />
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Draggable Items Pool */}
            <div className="flex flex-wrap gap-3 p-4 bg-slate-800/50 rounded-2xl min-h-[80px]">
                {task.dragItems?.map(item => {
                    if (placedItems[item.id]) return null; // Already placed

                    return (
                        <motion.div
                            key={item.id}
                            layoutId={item.id}
                            drag
                            dragConstraints={containerRef}
                            dragElastic={0.1}
                            dragMomentum={false}
                            onDragEnd={(e, info) => handleDragEnd(item.id, info)}
                            whileDrag={{ scale: 1.1, zIndex: 100 }}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-full shadow-md cursor-grab active:cursor-grabbing border border-slate-500"
                        >
                            {item.label}
                        </motion.div>
                    );
                })}
                {Object.keys(placedItems).length === task.dragItems?.length && !isSubmitted && (
                    <div className="w-full text-center text-slate-400 text-sm italic">
                        Все элементы размещены. Нажми "Проверить".
                    </div>
                )}
            </div>

            <button
                onClick={checkAnswers}
                disabled={isSubmitted || Object.keys(placedItems).length !== (task.dragItems?.length || 0)}
                className="w-full py-4 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-primary-600/20"
            >
                {isSubmitted ? 'Проверка...' : 'Проверить'}
            </button>
        </div>
    );
};

export default DragToImageTask;
