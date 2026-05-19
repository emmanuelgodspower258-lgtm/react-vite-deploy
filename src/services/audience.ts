import { normalizeClassName } from './schoolPaths';

export const isParentRole = (role: unknown) => ['PARENT', 'PARENTS', 'GUARDIAN', 'GUARDIANS'].includes(String(role || '').toUpperCase());
export const isStaffRole = (role: unknown) => ['ADMIN', 'PRINCIPAL', 'TEACHER', 'ACCOUNTANT', 'STAFF'].includes(String(role || '').toUpperCase());

const classTokenFromAudience = (audience: string) => audience
    .replace(/_PARENTS$/, '')
    .replace(/^PRI(\d)$/i, 'Primary $1')
    .replace(/^JSS(\d)$/i, 'JSS $1')
    .replace(/^SS(\d)$/i, 'SS $1');

export const resolveAudienceUsers = (
    audience: string,
    users: any[],
    students: any[] = [],
) => {
    const normalizedAudience = String(audience || 'ALL').toUpperCase();
    if (normalizedAudience === 'ALL') return users;
    if (normalizedAudience === 'ALL_STAFF') return users.filter((user) => isStaffRole(user.role));
    if (normalizedAudience === 'ALL_PARENTS') return users.filter((user) => isParentRole(user.role));

    if (normalizedAudience.endsWith('_PARENTS')) {
        const targetClass = normalizeClassName(classTokenFromAudience(normalizedAudience));
        const admissionsInClass = new Set(students
            .filter((student) => normalizeClassName(student.currentClass || student.classId).startsWith(targetClass))
            .map((student) => String(student.admissionNumber || '').trim())
            .filter(Boolean));
        const parentUidsInClass = new Set(students
            .filter((student) => normalizeClassName(student.currentClass || student.classId).startsWith(targetClass))
            .map((student) => String(student.parentUid || '').trim())
            .filter(Boolean));
        return users.filter((user) =>
            isParentRole(user.role) &&
            (parentUidsInClass.has(user.id || user.uid) || admissionsInClass.has(String(user.studentAdmissionNumber || '').trim()))
        );
    }

    return users.filter((user) => user.id === audience || user.uid === audience);
};

export const participantsFromUsers = (users: any[]) => users.reduce((participants, user) => {
    const uid = user.id || user.uid;
    if (uid) participants[uid] = true;
    return participants;
}, {} as Record<string, boolean>);

