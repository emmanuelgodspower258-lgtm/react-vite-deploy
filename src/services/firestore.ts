import { get, push, ref, remove, serverTimestamp, set, update } from 'firebase/database';
import { auth, rtdb } from './firebase';
import { schoolIdFromPath } from './schoolPaths';

export const logActivity = async (action: string, entity: string, details: Record<string, any> = {}) => {
    if (entity === 'activityLogs') return;
    const schoolId = details.schoolId || schoolIdFromPath(entity);
    if (!schoolId) return;
    const logRef = push(ref(rtdb, `schools/${schoolId}/activityLogs`));
    await set(logRef, {
        id: logRef.key,
        action,
        entity: entity.replace(/^schools\/[^/]+\//, ''),
        message: details.message || `${action} ${entity}`,
        actorId: auth.currentUser?.uid || '',
        actorEmail: auth.currentUser?.email || '',
        schoolId,
        timestamp: new Date().toISOString(),
        ...details,
    });
};

export const createDoc = async <T extends Record<string, any>>(path: string, data: T, id?: string) => {
    const itemRef = id ? ref(rtdb, `${path}/${id}`) : push(ref(rtdb, path));
    if (id && path.includes('/grades')) {
        const existing = await get(itemRef);
        if (existing.exists() && existing.val()?.locked) {
            throw new Error('This grade record is locked and cannot be overwritten.');
        }
    }
    const key = id || itemRef.key || crypto.randomUUID();
    const payload = {
        ...data,
        id: key,
        createdAt: data.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    await set(itemRef, payload);
    await logActivity('created', path, { recordId: key, schoolId: payload.schoolId || schoolIdFromPath(path) });
    return { id: key, ...data };
};

export const updateDoc = async <T extends Record<string, any>>(path: string, id: string, data: Partial<T>) => {
    const docRef = ref(rtdb, id ? `${path}/${id}` : path);
    if (path.includes('/grades') && id) {
        const existing = await get(docRef);
        if (existing.exists() && existing.val()?.locked) {
            throw new Error('This grade record is locked and cannot be updated.');
        }
    }
    await update(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
    });
    await logActivity('updated', path, { recordId: id, schoolId: (data as any).schoolId || schoolIdFromPath(path) });
    return { id, ...data };
};

export const deleteRealtimeDoc = async (path: string, id: string) => {
    await remove(ref(rtdb, `${path}/${id}`));
    await logActivity('deleted', path, { recordId: id, schoolId: schoolIdFromPath(path) });
    return id;
};

export const getRealtimeDoc = async <T = any>(path: string, id: string) => {
    const snapshot = await get(ref(rtdb, `${path}/${id}`));
    return snapshot.exists() ? ({ id, ...snapshot.val() } as T & { id: string }) : null;
};

export const getCollection = async <T = any>(path: string) => {
    const snapshot = await get(ref(rtdb, path));
    const value = snapshot.val() || {};
    return Object.entries(value).map(([id, data]) => ({ id, ...(data as T) }));
};
