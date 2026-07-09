import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { writable } from 'svelte/store';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Mocks for layout compilation
export const currentAppHash = writable('#/projects');

export function normalizeAppHash(hash: string) {
    return hash;
}

export function appHashToPageName(hash: string) {
    return 'Projects Dashboard';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
