import confetti from 'canvas-confetti';

let confettiCanvas: HTMLCanvasElement | null = null;
let confettiInstance: confetti.CreateTypes | null = null;

export const fireConfetti = (options: confetti.Options = {}) => {
    if (!confettiCanvas) {
        confettiCanvas = document.createElement('canvas');
        confettiCanvas.style.position = 'fixed';
        confettiCanvas.style.top = '0';
        confettiCanvas.style.left = '0';
        confettiCanvas.style.width = '100%';
        confettiCanvas.style.height = '100%';
        confettiCanvas.style.pointerEvents = 'none';
        confettiCanvas.style.zIndex = '9999';
        document.body.appendChild(confettiCanvas);
        
        confettiInstance = confetti.create(confettiCanvas, {
            resize: true,
            useWorker: true
        });
    }

    if (confettiInstance) {
        confettiInstance(options);
    }
};
