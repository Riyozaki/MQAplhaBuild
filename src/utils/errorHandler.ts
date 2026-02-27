import { toast } from 'react-toastify';

export const handleApiError = (e: any) => {
    if (e.message === 'OFFLINE_SAVED') {
        toast.warning("Нет сети. Данные сохранятся позже.", { autoClose: 3000 });
    } else {
        console.warn("API Error:", e);
    }
};
