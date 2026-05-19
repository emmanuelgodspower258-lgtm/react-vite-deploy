import { useEffect, useMemo, useState } from 'react';
import { equalTo, off, onValue, orderByChild, query as dbQuery, ref, type Query } from 'firebase/database';
import { rtdb } from './firebase';
import { normalizeClassName, schoolPath } from './schoolPaths';
import { useAuth } from '../context/AuthContext';

export type SearchResultType = 'student' | 'staff' | 'user' | 'class';

export type SearchResult<T = any> = {
    id: string;
    type: SearchResultType;
    name: string;
    meta: string;
    record: T & { id: string };
};

export type GlobalSearchResults = {
    students: SearchResult[];
    staff: SearchResult[];
    users: SearchResult[];
    classes: SearchResult[];
};

type SearchOptions = {
    classId?: string;
    roles?: string[];
    section?: 'primary' | 'secondary' | '';
    assignedClass?: string;
    role?: string;
};

const emptyGlobalResults: GlobalSearchResults = {
    students: [],
    staff: [],
    users: [],
    classes: [],
};

const normalizedQuery = (query: string) => String(query || '').trim().toLowerCase();
const valueText = (value: unknown) => String(value || '').toLowerCase();
const fullName = (item: any) => `${item.firstName || item.name?.split(' ')[0] || ''} ${item.lastName || item.name?.split(' ').slice(1).join(' ') || ''}`.trim() || item.name || item.email || '';
const recordClass = (item: any) => item.classId || item.currentClass || item.studentClass || item.assignedClass || '';
const recordSection = (item: any) => {
    const cls = normalizeClassName(recordClass(item) || item.name || item.grade);
    if (cls.startsWith('PRI')) return 'primary';
    if (cls.startsWith('JSS') || cls.startsWith('SS')) return 'secondary';
    return '';
};

const toRows = (snapshotValue: any) => Object.entries(snapshotValue || {}).map(([id, value]) => ({
    id,
    ...(value as Record<string, unknown>),
}));

const matchesQuery = (item: any, fields: Array<unknown>, query: string) => {
    const q = normalizedQuery(query);
    if (!q) return true;
    return fields.some((field) => valueText(field).includes(q));
};

const classMatches = (value: unknown, target?: string) => {
    if (!target || target === 'ALL') return true;
    return normalizeClassName(value) === normalizeClassName(target);
};

const roleMatches = (role: unknown, roles?: string[]) => {
    if (!roles?.length) return true;
    const normalizedRole = String(role || '').toUpperCase();
    return roles.map((item) => item.toUpperCase()).some((item) => {
        if (item === 'STAFF') return ['ADMIN', 'PRINCIPAL', 'ACCOUNTANT', 'STAFF'].includes(normalizedRole);
        if (item === 'TEACHER') return normalizedRole.includes('TEACHER') || normalizedRole === 'TEACHER';
        return normalizedRole === item;
    });
};

const mapStudentResult = (student: any): SearchResult => ({
    id: student.id,
    type: 'student',
    name: fullName(student),
    meta: [student.admissionNumber, student.currentClass || student.classId].filter(Boolean).join(' • '),
    record: {
        ...student,
        admissionNumber: student.admissionNumber || student.admissionNo || '',
        firstName: student.firstName || student.name?.split(' ')[0] || '',
        lastName: student.lastName || student.name?.split(' ').slice(1).join(' ') || '',
    },
});

const mapStaffResult = (staff: any): SearchResult => ({
    id: staff.id,
    type: 'staff',
    name: fullName(staff),
    meta: [staff.employeeId, staff.role, staff.assignedClass].filter(Boolean).join(' • '),
    record: staff,
});

const mapUserResult = (user: any): SearchResult => ({
    id: user.id,
    type: 'user',
    name: fullName(user),
    meta: [user.role, user.classId || user.studentClass || user.assignedClass, user.studentAdmissionNumber || user.admissionNumber].filter(Boolean).join(' • '),
    record: {
        ...user,
        uid: user.uid || user.id,
        admissionNumber: user.admissionNumber || user.studentAdmissionNumber || '',
        classId: user.classId || user.studentClass || user.assignedClass || '',
    },
});

const mapClassResult = (classRecord: any): SearchResult => ({
    id: classRecord.id,
    type: 'class',
    name: classRecord.name || [classRecord.grade, classRecord.section].filter(Boolean).join(' ') || classRecord.id,
    meta: [classRecord.grade, classRecord.section].filter(Boolean).join(' • '),
    record: classRecord,
});

const listenToSearch = (
    schoolId: string,
    path: string,
    queryText: string,
    mapper: (record: any) => SearchResult,
    filterRecord: (record: any) => boolean,
    callback: (results: SearchResult[]) => void,
    source?: Query,
) => {
    if (!schoolId) {
        callback([]);
        return () => undefined;
    }
    const sourceRef = source || ref(rtdb, schoolPath(schoolId, path));
    onValue(sourceRef, (snapshot) => {
        const results = toRows(snapshot.val())
            .filter(filterRecord)
            .map(mapper)
            .filter((result) => Boolean(result.id));
        callback(results);
    }, (error) => {
        console.warn(`Search listener failed for ${path}:`, error);
        callback([]);
    });
    return () => off(sourceRef);
};

export const searchStudents = (
    schoolId: string,
    queryText: string,
    callback: (results: SearchResult[]) => void,
    options: SearchOptions = {},
) => {
    if (!schoolId) {
        callback([]);
        return () => undefined;
    }
    const source = options.classId && options.classId !== 'ALL'
        ? dbQuery(ref(rtdb, schoolPath(schoolId, 'students')), orderByChild('currentClass'), equalTo(options.classId))
        : options.role === 'TEACHER' && options.assignedClass
            ? dbQuery(ref(rtdb, schoolPath(schoolId, 'students')), orderByChild('currentClass'), equalTo(options.assignedClass))
            : undefined;
    return listenToSearch(schoolId, 'students', queryText, mapStudentResult, (student) =>
        matchesQuery(student, [student.firstName, student.lastName, student.name, student.admissionNumber, student.currentClass, student.classId], queryText) &&
        classMatches(student.currentClass || student.classId, options.classId) &&
        (!options.section || recordSection(student) === options.section),
    callback, source);
};

export const searchStaff = (
    schoolId: string,
    queryText: string,
    callback: (results: SearchResult[]) => void,
    options: SearchOptions = {},
) => {
    if (!schoolId) {
        callback([]);
        return () => undefined;
    }
    return listenToSearch(schoolId, 'staff', queryText, mapStaffResult, (staff) =>
    matchesQuery(staff, [staff.firstName, staff.lastName, staff.name, staff.employeeId, staff.role, staff.assignedClass], queryText) &&
    roleMatches(staff.role, options.roles) &&
    classMatches(staff.assignedClass || staff.classId, options.classId),
callback);
};

export const searchUsers = (
    schoolId: string,
    queryText: string,
    callback: (results: SearchResult[]) => void,
    options: SearchOptions = {},
) => {
    if (!schoolId) {
        callback([]);
        return () => undefined;
    }
    return listenToSearch(schoolId, 'users', queryText, mapUserResult, (user) =>
        matchesQuery(user, [user.name, fullName(user), user.role, user.classId, user.studentClass, user.assignedClass, user.admissionNumber, user.studentAdmissionNumber], queryText) &&
        roleMatches(user.role, options.roles) &&
        classMatches(user.classId || user.studentClass || user.assignedClass, options.classId) &&
        (!options.section || recordSection(user) === options.section),
    callback);
};

export const searchClasses = (
    schoolId: string,
    queryText: string,
    callback: (results: SearchResult[]) => void,
    options: SearchOptions = {},
) => {
    if (!schoolId) {
        callback([]);
        return () => undefined;
    }
    return listenToSearch(schoolId, 'classes', queryText, mapClassResult, (classRecord) =>
    matchesQuery(classRecord, [classRecord.name, classRecord.grade, classRecord.section], queryText) &&
    (!options.section || recordSection(classRecord) === options.section),
callback);
};

export const globalSearch = (
    schoolId: string,
    queryText: string,
    callback: (results: GlobalSearchResults) => void,
    options: SearchOptions = {},
) => {
    const next: GlobalSearchResults = { ...emptyGlobalResults };
    const emit = () => callback({
        students: next.students,
        staff: next.staff,
        users: next.users,
        classes: next.classes,
    });
    const unsubscribers = [
        searchStudents(schoolId, queryText, (results) => { next.students = results; emit(); }, options),
        searchStaff(schoolId, queryText, (results) => { next.staff = results; emit(); }, options),
        searchUsers(schoolId, queryText, (results) => { next.users = results; emit(); }, options),
        searchClasses(schoolId, queryText, (results) => { next.classes = results; emit(); }, options),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
};

export const searchUsersAndClasses = (
    schoolId: string,
    queryText: string,
    callback: (results: { users: SearchResult[]; classes: SearchResult[] }) => void,
    options: SearchOptions = {},
) => {
    const next = { users: [] as SearchResult[], classes: [] as SearchResult[] };
    const emit = () => callback(next);
    const unsubscribers = [
        searchUsers(schoolId, queryText, (results) => { next.users = results; emit(); }, options),
        searchClasses(schoolId, queryText, (results) => { next.classes = results; emit(); }, options),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
};

export const useDebouncedValue = <T,>(value: T, delay = 300) => {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timeout = window.setTimeout(() => setDebounced(value), Math.max(delay, 300));
        return () => window.clearTimeout(timeout);
    }, [value, delay]);
    return debounced;
};

const useSchoolSearch = (
    queryText: string,
    listener: (schoolId: string, queryText: string, callback: (results: any) => void, options?: SearchOptions) => () => void,
    options: SearchOptions = {},
) => {
    const { user } = useAuth();
    const debouncedQuery = useDebouncedValue(queryText, 300);
    const [results, setResults] = useState<any>([]);
    const [isLoading, setIsLoading] = useState(true);
    const stableOptions = useMemo(() => JSON.stringify(options), [options]);

    useEffect(() => {
        setIsLoading(true);
        if (!user?.schoolId) {
            setResults(Array.isArray(results) ? [] : emptyGlobalResults);
            setIsLoading(false);
            return;
        }
        const parsedOptions = JSON.parse(stableOptions || '{}');
        const unsubscribe = listener(user.schoolId, debouncedQuery, (nextResults) => {
            setResults(nextResults);
            setIsLoading(false);
        }, {
            ...parsedOptions,
            role: user.role,
            assignedClass: user.assignedClass,
        });
        return unsubscribe;
    }, [user?.schoolId, user?.role, user?.assignedClass, debouncedQuery, stableOptions]);

    return { results, isLoading, query: debouncedQuery };
};

export const useStudentSearch = (queryText: string, options: SearchOptions = {}) =>
    useSchoolSearch(queryText, searchStudents, options) as { results: SearchResult[]; isLoading: boolean; query: string };

export const useStaffSearch = (queryText: string, options: SearchOptions = {}) =>
    useSchoolSearch(queryText, searchStaff, options) as { results: SearchResult[]; isLoading: boolean; query: string };

export const useUserSearch = (queryText: string, options: SearchOptions = {}) =>
    useSchoolSearch(queryText, searchUsers, options) as { results: SearchResult[]; isLoading: boolean; query: string };

export const useClassSearch = (queryText: string, options: SearchOptions = {}) =>
    useSchoolSearch(queryText, searchClasses, options) as { results: SearchResult[]; isLoading: boolean; query: string };

export const useGlobalSearch = (queryText: string, options: SearchOptions = {}) =>
    useSchoolSearch(queryText, globalSearch, options) as { results: GlobalSearchResults; isLoading: boolean; query: string };

export const useSearchUsersAndClasses = (queryText: string, options: SearchOptions = {}) =>
    useSchoolSearch(queryText, searchUsersAndClasses, options) as { results: { users: SearchResult[]; classes: SearchResult[] }; isLoading: boolean; query: string };
