import { writable } from 'svelte/store';
export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

function createToastStore() {
    const { subscribe, update } = writable<ToastMessage[]>([]);

    return {
        subscribe,
        add: (message: string, type: ToastType = 'info', duration: number = 3000) => {
            const id = crypto.randomUUID();
            update(toasts => [...toasts, { id, message, type, duration }]);
            
            setTimeout(() => {
                update(toasts => toasts.filter(t => t.id !== id));
            }, duration);
        },
        remove: (id: string) => {
            update(toasts => toasts.filter(t => t.id !== id));
        },
        success: (message: string, duration?: number) => {
            toast.add(message, 'success', duration);
        },
        error: (message: string, duration?: number) => {
            toast.add(message, 'error', duration);
        },
        info: (message: string, duration?: number) => {
            toast.add(message, 'info', duration);
        }
    };
}

export const toast = createToastStore();
