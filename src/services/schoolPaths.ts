import { equalTo, get, orderByChild, query, ref } from 'firebase/database';
import { rtdb } from './firebase';
import type { User } from '../types';

export const SCHOOL_ROOT = 'schools';

export const normalizeRole = (role: unknown): User['role'] | '' => {
    const rawRole = String(role || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (!rawRole) return '';
    const roleAliases: Record<string, User['role']> = {
        ADMINISTRATOR: 'ADMIN',
        SCHOOL_ADMIN: 'ADMIN',
        SUPERADMIN: 'SUPER_ADMIN',
        SUPER_ADMINISTRATOR: 'SUPER_ADMIN',
        STAFF: 'TEACHER',
        STAFF_TEACHER: 'TEACHER',
        TEACHERS: 'TEACHER',
        SUBJECT_TEACHER: 'TEACHER',
        FORM_MASTER: 'TEACHER',
        FORM_TEACHER: 'TEACHER',
        CLASS_TEACHER: 'TEACHER',
        PARENTS: 'PARENT',
        GUARDIAN: 'PARENT',
        GUARDIANS: 'PARENT',
        ACCOUNTANTS: 'ACCOUNTANT',
    };
    return (roleAliases[rawRole] || rawRole) as User['role'];
};

export const normalizeList = (value: unknown): string[] => Array.isArray(value)
    ? value.map(String).map((item) => item.trim()).filter(Boolean)
    : typeof value === 'string'
        ? value.split(',').map((item) => item.trim()).filter(Boolean)
        : value && typeof value === 'object'
            ? Object.values(value as Record<string, unknown>).map(String).map((item) => item.trim()).filter(Boolean)
            : [];

export const isSchoolScopedPath = (path: string) => path.startsWith(`${SCHOOL_ROOT}/`);

export const schoolPath = (schoolId: string, path: string) => {
    const cleanPath = path.replace(/^\/+/, '');
    if (isSchoolScopedPath(cleanPath)) return cleanPath;
    if (!schoolId) throw new Error(`A schoolId is required to access ${cleanPath}.`);
    if (!cleanPath) return `${SCHOOL_ROOT}/${schoolId}`;
    return `${SCHOOL_ROOT}/${schoolId}/${cleanPath}`;
};

export const schoolIdFromPath = (path: string) => {
    const [, schoolId] = path.match(/^schools\/([^/]+)/) || [];
    return schoolId || '';
};

export const normalizeClassName = (value: unknown) => String(value || '')
    .trim()
    .toUpperCase()
    .replace(/PRIMARY\s*/g, 'PRI')
    .replace(/\s+/g, '');

const normalizeAdmissionNumber = (value: unknown) => String(value || '').trim().toUpperCase();
const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase();

const getProfileSchoolId = (profile: Record<string, any>) =>
    profile.schoolId || profile.schoolID || profile.school_id || profile.tenantId || profile.tenantID || '';

export const userDisplayName = (user: Partial<User> & Record<string, any>) =>
    `${user.firstName || user.name?.split(' ')[0] || ''} ${user.lastName || user.name?.split(' ').slice(1).join(' ') || ''}`.trim() || user.email || 'User';

const enrichLinkedStudent = (profile: Record<string, any>, school: any, schoolId: string) => {
    const admissionNumber = normalizeAdmissionNumber(profile.studentAdmissionNumber || profile.admissionNumber || profile.admissionNo);
    const email = normalizeEmail(profile.email);
    const linkedEntry = Object.entries((school as any)?.students || {}).find(([, student]: any) => {
        const studentAdmission = normalizeAdmissionNumber(student?.admissionNumber || student?.admissionNo || student?.adm);
        const parentEmails = [
            student?.parentEmail,
            student?.guardianEmail,
            student?.email,
            student?.motherEmail,
            student?.fatherEmail,
        ].map(normalizeEmail).filter(Boolean);
        return (admissionNumber && studentAdmission === admissionNumber) ||
            student?.parentUid === profile.uid ||
            student?.parentUid === profile.id ||
            (email && parentEmails.includes(email));
    });
    if (!linkedEntry) return { ...profile, schoolId };
    const [studentId, student] = linkedEntry as [string, any];
    return {
        ...profile,
        schoolId,
        studentId,
        studentClass: student.currentClass || student.classId || '',
    };
};

const enrichLinkedStudentFromDatabase = async (profile: Record<string, any>, schoolId: string) => {
    if (!schoolId) return { ...profile, schoolId };
    if (profile.studentId) {
        const studentSnapshot = await get(ref(rtdb, `${SCHOOL_ROOT}/${schoolId}/students/${profile.studentId}`));
        const student = studentSnapshot.val();
        if (student) {
            return {
                ...profile,
                schoolId,
                studentClass: profile.studentClass || student.currentClass || student.classId || '',
            };
        }
    }

    const admissionNumber = normalizeAdmissionNumber(profile.studentAdmissionNumber || profile.admissionNumber || profile.admissionNo);
    if (admissionNumber) {
        const studentQuery = query(ref(rtdb, `${SCHOOL_ROOT}/${schoolId}/students`), orderByChild('admissionNumber'), equalTo(admissionNumber));
        const studentSnapshot = await get(studentQuery);
        const [studentId, student] = Object.entries(studentSnapshot.val() || {})[0] || [];
        if (studentId && student) {
            return {
                ...profile,
                schoolId,
                studentId,
                studentClass: (student as any).currentClass || (student as any).classId || '',
            };
        }
    }

    return { ...profile, schoolId };
};

export const getUserProfile = async (uid: string) => {
    const superAdminSnapshot = await get(ref(rtdb, `superAdmins/${uid}`));
    if (superAdminSnapshot.exists()) {
        const data = superAdminSnapshot.val();
        return { ...data, uid, id: uid, role: 'SUPER_ADMIN', schoolId: '' };
    }

    const indexSnapshot = await get(ref(rtdb, `userSchools/${uid}`));
    if (indexSnapshot.exists()) {
        const index = indexSnapshot.val() || {};
        if (index.schoolId) {
            const userSnapshot = await get(ref(rtdb, `${SCHOOL_ROOT}/${index.schoolId}/users/${uid}`));
            const user = userSnapshot.val();
            if (user) return enrichLinkedStudentFromDatabase({ ...user, uid, id: uid }, index.schoolId);
        }
    }

    try {
        const schoolsSnapshot = await get(ref(rtdb, SCHOOL_ROOT));
        const schools = schoolsSnapshot.val() || {};
        for (const [schoolId, school] of Object.entries(schools)) {
            const user = (school as any)?.users?.[uid];
            if (user) return enrichLinkedStudent({ ...user, uid, id: uid }, school, schoolId);
        }
    } catch (error) {
        console.warn('Could not scan schools while resolving a user profile:', error);
    }
    throw new Error('User profile not found in Realtime Database.');
};
