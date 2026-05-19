import { useCallback, useEffect, useState } from 'react';
import { equalTo, off, onValue, orderByChild, query, ref } from 'firebase/database';
import { rtdb } from './firebase';
import { createDoc, deleteRealtimeDoc, updateDoc } from './firestore';
import { useAuth } from '../context/AuthContext';
import { isSchoolScopedPath, normalizeClassName, schoolPath } from './schoolPaths';

const makeMutationResult = <T,>(run: () => Promise<T>) => ({
    unwrap: run,
    then: (resolve: (value: T) => void, reject?: (reason: unknown) => void) => run().then(resolve, reject),
});

const isRole = (role: unknown, target: string) => String(role || '').toUpperCase() === target;
const isElevatedRole = (role: unknown) => ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'ACCOUNTANT'].includes(String(role || '').toUpperCase());

const classMatches = (a: unknown, b: unknown) => Boolean(a && b && normalizeClassName(a) === normalizeClassName(b));

const hasScoreForParent = (item: any, user: any) => {
    const admissionNumber = String(user?.studentAdmissionNumber || '').trim();
    if (!admissionNumber) return false;
    if (String(item.studentAdmissionNumber || '').trim() === admissionNumber) return true;
    if (item.studentAdmissionNumbers && Object.values(item.studentAdmissionNumbers).map(String).includes(admissionNumber)) return true;
    if (item.scores?.[user?.studentId || ''] !== undefined) return true;
    if (item.scores?.[admissionNumber] !== undefined) return true;
    return false;
};

const canReadRow = (collection: string, item: any, user: any) => {
    if (!user?.id || isRole(user.role, 'SUPER_ADMIN') || isRole(user.role, 'ADMIN') || isRole(user.role, 'PRINCIPAL') || isRole(user.role, 'ACCOUNTANT')) return true;
    if (isRole(user.role, 'TEACHER')) {
        if (collection === 'students') return classMatches(item.classId || item.currentClass, user.assignedClass);
        if (collection === 'assignments') return item.teacherId === user.id || classMatches(item.targetClass, user.assignedClass);
        if (collection === 'grades' || collection === 'reportCards') return classMatches(item.classId || item.className, user.assignedClass) && (!item.subjectId || !user.assignedSubjects?.length || user.assignedSubjects.includes(item.subjectId));
        if (collection === 'subjects') return item.teacherId === user.id || item.teacherUid === user.id || item.assignedTeacherId === user.id || classMatches(item.classId || item.className || item.assignedClass, user.assignedClass) || (item.classes || item.assignedClasses || []).some((cls: string) => classMatches(cls, user.assignedClass));
        if (['users', 'messages', 'notifications', 'activityLogs'].includes(collection)) return true;
        return false;
    }
    if (isRole(user.role, 'PARENT')) {
        const admissionNumber = String(user.studentAdmissionNumber || '').trim();
        if (collection === 'students') return item.parentUid === user.id || String(item.admissionNumber || '').trim() === admissionNumber || item.id === user.studentId;
        if (collection === 'fees') return item.parentUid === user.id || String(item.studentAdmissionNumber || '').trim() === admissionNumber;
        if (collection === 'grades') return hasScoreForParent(item, user);
        if (collection === 'reportCards') return item.published === true && hasScoreForParent(item, user);
        if (collection === 'assignments') return classMatches(item.targetClass, user.studentClass);
        if (collection === 'users') return item.id === user.id;
        if (['notifications', 'messages'].includes(collection)) return true;
        return false;
    }
    return false;
};

const assertCanMutate = (collection: string, payload: Record<string, any>, user: any) => {
    if (!user?.id) throw new Error('You must be logged in.');
    if (collection === 'schools') {
        if (isRole(user.role, 'SUPER_ADMIN')) return;
        throw new Error('Only a super admin can write schools.');
    }
    if (isRole(user.role, 'SUPER_ADMIN') || isRole(user.role, 'ADMIN') || isRole(user.role, 'PRINCIPAL') || isRole(user.role, 'ACCOUNTANT')) return;
    if (isRole(user.role, 'TEACHER')) {
        if (collection === 'assignments' && classMatches(payload.targetClass, user.assignedClass)) return;
        if (collection === 'grades' && classMatches(payload.classId, user.assignedClass) && (payload.teacherId === user.id || !payload.subjectId || user.assignedSubjects?.includes(payload.subjectId))) return;
        if (collection === 'notifications' && ['ATTENDANCE', 'ACADEMIC', 'STUDENT_REPORT'].includes(String(payload.category || '').toUpperCase())) return;
        if (collection === 'tickets' || collection === 'messages') return;
    }
    if (isRole(user.role, 'PARENT') && (collection === 'tickets' || collection === 'messages' || collection === 'assignmentSubmissions')) return;
    throw new Error(`Your role cannot write to ${collection}.`);
};

const dedupeRows = <T,>(rows: Array<T & { id: string }>) => {
    const seen = new Map<string, T & { id: string }>();
    rows.forEach((row) => seen.set(row.id, row));
    return Array.from(seen.values());
};

const schoolScopedListenerSources = (collection: string, basePath: string, user: any) => {
    const role = String(user?.role || '').toUpperCase();
    const collectionRef = ref(rtdb, basePath);
    if (isElevatedRole(role)) return [{ source: collectionRef, mode: 'collection' as const }];

    if (role === 'TEACHER') {
        if (collection === 'students' && user.assignedClass) {
            return [{ source: query(collectionRef, orderByChild('currentClass'), equalTo(user.assignedClass)), mode: 'collection' as const }];
        }
        if (collection === 'assignments' && user.assignedClass) {
            return [{ source: query(collectionRef, orderByChild('targetClass'), equalTo(user.assignedClass)), mode: 'collection' as const }];
        }
        if ((collection === 'grades' || collection === 'reportCards') && user.assignedClass) {
            return [{ source: query(collectionRef, orderByChild('classId'), equalTo(user.assignedClass)), mode: 'collection' as const }];
        }
        if (collection === 'subjects') {
            return [
                { source: query(collectionRef, orderByChild('teacherId'), equalTo(user.id)), mode: 'collection' as const },
                { source: query(collectionRef, orderByChild('teacherUid'), equalTo(user.id)), mode: 'collection' as const },
            ];
        }
        if (collection === 'messages' || collection === 'notifications') {
            return [{ source: query(collectionRef, orderByChild(`participants/${user.id}`), equalTo(true)), mode: 'collection' as const }];
        }
    }

    if (role === 'PARENT') {
        if (collection === 'users') {
            return [{ source: ref(rtdb, `${basePath}/${user.id}`), mode: 'single' as const, id: user.id }];
        }
        if (collection === 'students') {
            if (user.studentId) return [{ source: ref(rtdb, `${basePath}/${user.studentId}`), mode: 'single' as const, id: user.studentId }];
            if (user.studentAdmissionNumber) return [{ source: query(collectionRef, orderByChild('admissionNumber'), equalTo(user.studentAdmissionNumber)), mode: 'collection' as const }];
        }
        if (collection === 'fees') {
            return [
                { source: query(collectionRef, orderByChild('parentUid'), equalTo(user.id)), mode: 'collection' as const },
                ...(user.studentAdmissionNumber ? [{ source: query(collectionRef, orderByChild('studentAdmissionNumber'), equalTo(user.studentAdmissionNumber)), mode: 'collection' as const }] : []),
            ];
        }
        if (collection === 'assignments' && user.studentClass) {
            return [{ source: query(collectionRef, orderByChild('targetClass'), equalTo(user.studentClass)), mode: 'collection' as const }];
        }
        if (collection === 'reportCards' && user.studentId) {
            return [{ source: query(collectionRef, orderByChild('studentId'), equalTo(user.studentId)), mode: 'collection' as const }];
        }
        if (collection === 'messages' || collection === 'notifications') {
            return [{ source: query(collectionRef, orderByChild(`participants/${user.id}`), equalTo(true)), mode: 'collection' as const }];
        }
    }

    return [{ source: collectionRef, mode: 'collection' as const }];
};

export const useCollection = <T = any>(path: string) => {
    const { user } = useAuth();
    const [data, setData] = useState<Array<T & { id: string }>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        setIsLoading(true);
        if (!user?.id) {
            setData([]);
            setIsLoading(false);
            return;
        }

        const cleanPath = path.replace(/^\/+/, '');
        let effectivePath = '';
        try {
            effectivePath = cleanPath === 'schools'
                ? 'schools'
                : user.role === 'SUPER_ADMIN' && !isSchoolScopedPath(cleanPath)
                    ? 'schools'
                    : schoolPath(user.schoolId || '', cleanPath);
        } catch (err) {
            setData([]);
            setError(err instanceof Error ? err : new Error(String(err)));
            setIsLoading(false);
            return;
        }
        const sources = cleanPath === 'schools' || (user.role === 'SUPER_ADMIN' && effectivePath === 'schools')
            ? [{ source: ref(rtdb, effectivePath), mode: 'collection' as const }]
            : schoolScopedListenerSources(cleanPath, effectivePath, user);
        const sourceRows: Record<number, Array<T & { id: string }>> = {};

        sources.forEach((listener, index) => onValue(listener.source, (snapshot) => {
            const value = snapshot.val() || {};
            const rows = listener.mode === 'single'
                ? snapshot.exists()
                    ? [{ id: listener.id || snapshot.key || '', schoolId: user.schoolId, ...(value as T) }]
                    : []
                : cleanPath === 'schools'
                ? Object.entries(value).map(([id, item]) => ({ id, ...(item as T) }))
                : user.role === 'SUPER_ADMIN' && effectivePath === 'schools'
                ? Object.entries(value).flatMap(([schoolId, school]) => Object.entries((school as any)?.[cleanPath] || {}).map(([id, item]) => ({
                    id,
                    schoolId,
                    ...(item as T),
                })))
                : Object.entries(value).map(([id, item]) => ({ id, schoolId: user.schoolId, ...(item as T) }));
            sourceRows[index] = rows as Array<T & { id: string }>;
            setData(dedupeRows(Object.values(sourceRows).flat()).filter((row) => cleanPath === 'schools' || canReadRow(cleanPath, row, user)));
            setError(null);
            setIsLoading(false);
        }, (err) => {
            setError(err);
            setIsLoading(false);
        }));

        return () => sources.forEach((listener) => off(listener.source));
    }, [path, user?.id, user?.role, user?.schoolId, user?.assignedClass, user?.studentAdmissionNumber, user?.studentId, user?.studentClass, user?.assignedSubjects?.join('|')]);

    return { data, isLoading, error };
};

export const useCreateMutation = <T extends Record<string, any>>(path: string) => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const mutate = useCallback((payload: T, id?: string) => makeMutationResult(async () => {
        setIsLoading(true);
        try {
            assertCanMutate(path.replace(/^\/+/, ''), payload, user);
            const targetSchoolId = payload.schoolId || user?.schoolId || '';
            const effectivePath = path.replace(/^\/+/, '') === 'schools' ? 'schools' : schoolPath(targetSchoolId, path);
            return await createDoc(effectivePath, { ...payload, schoolId: targetSchoolId }, id);
        } finally {
            setIsLoading(false);
        }
    }), [path, user?.id, user?.role, user?.schoolId, user?.assignedClass, user?.assignedSubjects?.join('|')]);

    return [mutate, { isLoading }] as const;
};

export const useUpdateMutation = <T extends Record<string, any>>(path: string) => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const mutate = useCallback((payload: { id: string } & Partial<T>) => makeMutationResult(async () => {
        const { id, ...data } = payload;
        setIsLoading(true);
        try {
            assertCanMutate(path.replace(/^\/+/, ''), data as Record<string, any>, user);
            const targetSchoolId = (data as any).schoolId || user?.schoolId || '';
            const effectivePath = path.replace(/^\/+/, '') === 'schools' ? 'schools' : schoolPath(targetSchoolId, path);
            return await updateDoc(effectivePath, id, data as unknown as Partial<T>);
        } finally {
            setIsLoading(false);
        }
    }), [path, user?.id, user?.role, user?.schoolId, user?.assignedClass, user?.assignedSubjects?.join('|')]);

    return [mutate, { isLoading }] as const;
};

export const useSchoolValue = <T = any>(path: string) => {
    const { user } = useAuth();
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        setIsLoading(true);
        if (!user?.id || !user.schoolId) {
            setData(null);
            setIsLoading(false);
            return;
        }
        const valueRef = ref(rtdb, schoolPath(user.schoolId, path));
        onValue(valueRef, (snapshot) => {
            setData((snapshot.val() || null) as T | null);
            setError(null);
            setIsLoading(false);
        }, (err) => {
            setError(err);
            setIsLoading(false);
        });
        return () => off(valueRef);
    }, [path, user?.id, user?.schoolId]);

    return { data, isLoading, error };
};

export const useSetSchoolValue = <T extends Record<string, any>>(path: string) => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const mutate = useCallback((payload: T) => makeMutationResult(async () => {
        if (!user?.schoolId) throw new Error('A schoolId is required.');
        if (!(isRole(user.role, 'SUPER_ADMIN') || isRole(user.role, 'ADMIN') || isRole(user.role, 'PRINCIPAL'))) {
            throw new Error(`Your role cannot update ${path}.`);
        }
        setIsLoading(true);
        try {
            return await updateDoc(schoolPath(user.schoolId, path), '', payload);
        } finally {
            setIsLoading(false);
        }
    }), [path, user?.schoolId]);

    return [mutate, { isLoading }] as const;
};

export const useDeleteMutation = (path: string) => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const mutate = useCallback((id: string, schoolId?: string) => makeMutationResult(async () => {
        setIsLoading(true);
        try {
            const collection = path.replace(/^\/+/, '');
            if (!(isRole(user?.role, 'SUPER_ADMIN') || isRole(user?.role, 'ADMIN') || isRole(user?.role, 'PRINCIPAL'))) {
                throw new Error(`Your role cannot delete from ${collection}.`);
            }
            const effectivePath = path.replace(/^\/+/, '') === 'schools' ? 'schools' : schoolPath(schoolId || user?.schoolId || '', path);
            return await deleteRealtimeDoc(effectivePath, id);
        } finally {
            setIsLoading(false);
        }
    }), [path, user?.role, user?.schoolId]);

    return [mutate, { isLoading }] as const;
};
