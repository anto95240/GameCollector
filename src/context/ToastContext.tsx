import { createContext, ReactNode, useCallback, useContext, useEffect,useRef, useState } from "react";

export interface ToastOptions {
    actionLabel?: string;
    onAction?: () => void;
}

export interface ToastItem {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
    duration: number;
    actionLabel?: string;
    onAction?: () => void;
    priority: number;
    exiting: boolean;
}

export interface ToastContextType {
    toasts: ToastItem[];
    showToast: (message: string, type?: ToastItem['type'], duration?: number, options?: ToastOptions) => string;
    showSuccess: (message: string, duration?: number) => string;
    showError: (message: string, duration?: number) => string;
    showInfo: (message: string, duration?: number) => string;
    showCreated: (itemName: string, duration?: number) => string;
    showUpdated: (itemName: string, duration?: number) => string;
    showDeleted: (itemName: string, duration?: number) => string;
    hideToast: () => void;
    dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const MAX_VISIBLE = 3;
const EXIT_ANIM_DURATION = 300; // Doit correspondre à la durée CSS

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const activeTimers = useRef(new Map<string, NodeJS.Timeout | number>());

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
        if (activeTimers.current.has(id)) {
            clearTimeout(activeTimers.current.get(id) as number);
            activeTimers.current.delete(id);
        }
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
        setTimeout(() => removeToast(id), EXIT_ANIM_DURATION);
    }, [removeToast]);

    // Gère le démarrage des compteurs uniquement quand le toast devient visible
    useEffect(() => {
        const visible = toasts.slice(0, MAX_VISIBLE).filter(t => !t.exiting);
        
        visible.forEach(t => {
            if (!activeTimers.current.has(t.id) && t.duration !== Infinity) {
                const timer = setTimeout(() => {
                    dismissToast(t.id);
                }, t.duration);
                activeTimers.current.set(t.id, timer);
            }
        });
    }, [toasts, dismissToast]);

    const showToast = useCallback((message: string, type: ToastItem['type'] = 'success', duration = 3000, options: ToastOptions = {}) => {
        const id = Date.now() + Math.random().toString(36).substring(2, 9);
        const priority = type === 'error' ? 1 : 0; // Error passe en premier dans la file
        
        setToasts(prev => {
            const newToast: ToastItem = {
                id,
                message,
                type,
                duration,
                actionLabel: options.actionLabel,
                onAction: options.onAction,
                priority,
                exiting: false
            };
            
            // Les 3 premiers sont visibles et ne bougent pas
            const visible = prev.slice(0, MAX_VISIBLE);
            const queue = prev.slice(MAX_VISIBLE);
            
            // Insérer dans la file d'attente par priorité (descendante)
            const newQueue = [...queue, newToast].sort((a, b) => b.priority - a.priority);
            
            return [...visible, ...newQueue];
        });
        
        // Return id just in case caller wants to dismiss it manually
        return id;
    }, []);

    const showSuccess = useCallback((message: string, duration?: number) => showToast(message, 'success', duration), [showToast]);
    const showError = useCallback((message: string, duration = 4000) => showToast(message, 'error', duration), [showToast]);
    const showInfo = useCallback((message: string, duration?: number) => showToast(message, 'info', duration), [showToast]);
    const showCreated = useCallback((itemName: string, duration?: number) => showToast(`✓ ${itemName} créé(e) avec succès`, 'success', duration), [showToast]);
    const showUpdated = useCallback((itemName: string, duration?: number) => showToast(`✓ ${itemName} mis(e) à jour avec succès`, 'success', duration), [showToast]);
    const showDeleted = useCallback((itemName: string, duration?: number) => showToast(`✓ ${itemName} supprimé(e) avec succès`, 'success', duration), [showToast]);

    // Compatibilité arrière: ferme le premier toast visible
    const hideToast = useCallback(() => {
        setToasts(prev => {
            if (prev.length > 0) {
                // On passe par un id pour pouvoir l'appeler via setTimeout hors-cycle
                return prev; 
            }
            return prev;
        });
    }, []);

    return (
        <ToastContext.Provider value={{ 
            toasts: toasts.slice(0, MAX_VISIBLE), 
            showToast, 
            showSuccess, 
            showError, 
            showInfo, 
            showCreated, 
            showUpdated, 
            showDeleted,
            hideToast, // deprecated
            dismissToast // nouvelle méthode pour fermer manuellement
        }}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast doit être utilisé à l'intérieur d'un ToastProvider");
    }
    return context;
};
