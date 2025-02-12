// src/composables/useLocalStorage.ts
export function loadLocalData(key: string): any {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
}

export function saveLocalData(key: string, data: any): void {
    const existing = loadLocalData(key);
    const merged = { ...existing, ...data };
    localStorage.setItem(key, JSON.stringify(merged));
}
