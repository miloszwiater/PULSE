import { create } from 'zustand';

export interface ToastItem { id: number; text: string; tone: 'info' | 'ok' | 'error'; action?: { label: string; run: () => void } }

export const useToasts = create<{ items: ToastItem[] }>(() => ({ items: [] }));
let n = 0;

export function toast(text: string, tone: ToastItem['tone'] = 'info', action?: ToastItem['action'], ms = 4200) {
  const id = ++n;
  useToasts.setState((s) => ({ items: [...s.items.slice(-2), { id, text, tone, action }] }));
  setTimeout(() => dismissToast(id), action ? ms + 2500 : ms);
}

export function dismissToast(id: number) {
  useToasts.setState((s) => ({ items: s.items.filter((t) => t.id !== id) }));
}
