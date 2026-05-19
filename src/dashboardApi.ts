import { useEffect, useState } from 'react';
import { equalTo, off, onValue, orderByChild, query, ref } from 'firebase/database';
import { rtdb } from './services/firebase';
import { useAuth } from './context/AuthContext';
import { SCHOOL_ROOT, schoolPath } from './services/schoolPaths';

type DashboardSummary = {
    totalStudents: number;
    totalTeachers: number;
    totalStaff: number;
    totalClasses: number;
    totalSubjects: number;
    totalParents: number;
    totalFormMasters: number;
    activeClasses: number;
    pendingAssignments: number;
    unreadMessages: number;
    enrolledChildren: number;
    upcomingExams: number;
    outstandingFees: string;
    attendancePercentage: number;
    fees: { paidPercentage: number; outstandingAmount: string };
    currentSession: string;
    currentTerm: string;
    academicPerformance: any[];
    alerts: any[];
    upcomingEvents: any[];
    communications: { unreadCount: number; latestAnnouncement: string };
    upcomingLessons: any[];
    announcements: any[];
    recentActivities: any[];
};

const emptySummary: DashboardSummary = {
    totalStudents: 0,
    totalTeachers: 0,
    totalStaff: 0,
    totalClasses: 0,
    totalSubjects: 0,
    totalParents: 0,
    totalFormMasters: 0,
    activeClasses: 0,
    pendingAssignments: 0,
    unreadMessages: 0,
    enrolledChildren: 0,
    upcomingExams: 0,
    outstandingFees: '0',
    attendancePercentage: 0,
    fees: { paidPercentage: 0, outstandingAmount: '0' },
    currentSession: '',
    currentTerm: '',
    academicPerformance: [],
    alerts: [],
    upcomingEvents: [],
    communications: { unreadCount: 0, latestAnnouncement: '' },
    upcomingLessons: [],
    announcements: [],
    recentActivities: [],
};

const values = (node: any) => Object.values(node || {}) as any[];
const entries = (node: any) => Object.entries(node || {}).map(([id, value]) => ({ id, ...(value as any) }));
const isElevatedRole = (role: unknown) => ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'ACCOUNTANT'].includes(String(role || '').toUpperCase());
const mergeRows = (groups: any[][]) => Array.from(new Map(groups.flat().map((row: any) => [row.id, row])).values());

const flattenSchools = (schools: Record<string, any>) => Object.values(schools || {}).reduce((state: Record<string, any[]>, school: any) => {
    ['students', 'staff', 'users', 'classes', 'subjects', 'fees', 'activityLogs', 'notifications', 'assignments', 'lessons', 'reportCards'].forEach((key) => {
        state[key] = [...(state[key] || []), ...values(school?.[key])];
    });
    state.settings = [...(state.settings || []), school?.settings || {}];
    return state;
}, {});

const attendancePercentage = (attendance: any) => {
    if (Array.isArray(attendance)) {
        const statuses = attendance.map((record: any) => record.status || record);
        if (!statuses.length) return 0;
        const present = statuses.filter((status) => String(status).toLowerCase() === 'present').length;
        return Math.round((present / statuses.length) * 100);
    }
    const statuses = Object.values(attendance || {}).flatMap((dates: any) =>
        Object.values(dates || {}).flatMap((records: any) => Object.values(records || {}))
    );
    if (!statuses.length) return 0;
    const present = statuses.filter((status) => String(status).toLowerCase() === 'present').length;
    return Math.round((present / statuses.length) * 100);
};

const buildSummary = (state: Record<string, any>, role?: string, user?: any): DashboardSummary => {
    const students = Array.isArray(state.students) ? state.students : values(state.students);
    const staff = Array.isArray(state.staff) ? state.staff : values(state.staff);
    const users = Array.isArray(state.users) ? state.users : values(state.users);
    const classes = Array.isArray(state.classes) ? state.classes : values(state.classes);
    const subjects = Array.isArray(state.subjects) ? state.subjects : values(state.subjects);
    const fees = Array.isArray(state.fees) ? state.fees : values(state.fees);
    const activityLogs = Array.isArray(state.activityLogs) ? state.activityLogs : entries(state.activityLogs);
    const notifications = Array.isArray(state.notifications) ? state.notifications : entries(state.notifications);
    const assignments = Array.isArray(state.assignments) ? state.assignments : values(state.assignments);
    const lessons = Array.isArray(state.lessons) ? state.lessons : entries(state.lessons);
    const settings = Array.isArray(state.settings) ? state.settings[0] || {} : state.settings || {};
    const reportCards = Array.isArray(state.reportCards) ? state.reportCards : values(state.reportCards);

    const linkedStudents = String(role || '').toUpperCase() === 'PARENT'
        ? students.filter((student: any) => student.parentUid === user?.id || student.admissionNumber === user?.studentAdmissionNumber || student.id === user?.studentId)
        : students;
    const visibleFees = String(role || '').toUpperCase() === 'PARENT'
        ? fees.filter((fee: any) => fee.parentUid === user?.id || fee.studentAdmissionNumber === user?.studentAdmissionNumber)
        : fees;
    const outstanding = visibleFees
        .filter((fee: any) => !['CLEARED', 'PAID'].includes(String(fee.status || '').toUpperCase()))
        .reduce((sum: number, fee: any) => sum + Number(fee.balance || fee.amount || 0), 0);

    return {
        ...emptySummary,
        totalStudents: students.length,
        totalTeachers: staff.filter((person: any) => String(person.role || '').toUpperCase().includes('TEACHER')).length,
        totalStaff: staff.length,
        totalClasses: classes.length,
        totalSubjects: subjects.length,
        totalParents: users.filter((person: any) => String(person.role || '').toUpperCase() === 'PARENT').length,
        totalFormMasters: staff.filter((person: any) => person.assignedClass || person.assignedClasses?.length).length,
        activeClasses: String(role || '').toUpperCase() === 'TEACHER' ? (user?.assignedClass ? 1 : 0) : classes.length,
        pendingAssignments: String(role || '').toUpperCase() === 'TEACHER'
            ? assignments.filter((assignment: any) => assignment.teacherId === user?.id || assignment.targetClass === user?.assignedClass).length
            : assignments.length,
        unreadMessages: notifications.length,
        enrolledChildren: linkedStudents.length,
        outstandingFees: String(outstanding),
        attendancePercentage: attendancePercentage(state.attendance),
        fees: {
            paidPercentage: visibleFees.length ? Math.round((visibleFees.filter((fee: any) => ['CLEARED', 'PAID'].includes(String(fee.status || '').toUpperCase())).length / visibleFees.length) * 100) : 0,
            outstandingAmount: String(outstanding),
        },
        currentSession: settings.currentSession || '',
        currentTerm: settings.currentTerm || '',
        recentActivities: activityLogs.reverse().slice(0, 10),
        alerts: activityLogs.filter((log: any) => log.type === 'alert').slice(0, 5),
        communications: {
            unreadCount: notifications.length,
            latestAnnouncement: notifications[0]?.content || notifications[0]?.message || '',
        },
        upcomingLessons: lessons.slice(0, 5),
        announcements: notifications.slice(0, 5),
        academicPerformance: reportCards.slice(0, 7),
    };
};

export const useGetDashboardSummaryQuery = () => {
    const { user } = useAuth();
    const [data, setData] = useState<DashboardSummary>(emptySummary);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        setIsLoading(true);
        if (!user?.id) {
            setData(emptySummary);
            setIsLoading(false);
            return;
        }

        if (isElevatedRole(user.role)) {
            const path = user.role === 'SUPER_ADMIN' ? SCHOOL_ROOT : schoolPath(user.schoolId || '', '');
            const dashboardRef = ref(rtdb, path);
            onValue(dashboardRef, (snapshot) => {
                const value = snapshot.val() || {};
                const state = user.role === 'SUPER_ADMIN' ? flattenSchools(value) : value;
                setData(buildSummary(state, user.role, user));
                setError(null);
                setIsLoading(false);
            }, (err) => {
                setError(err);
                setIsLoading(false);
            });

            return () => off(dashboardRef);
        }

        const role = String(user.role || '').toUpperCase();
        const schoolId = user.schoolId || '';
        if (!schoolId) {
            setData(emptySummary);
            setError(new Error('Your account is not linked to a school. Ask an admin to recreate or relink this parent profile.'));
            setIsLoading(false);
            return;
        }
        const schoolRef = (path: string) => ref(rtdb, schoolPath(schoolId, path));
        const collectionRows = (value: any) => entries(value);
        const singleRow = (snapshot: any, id: string) => snapshot.exists() ? [{ id, ...(snapshot.val() || {}) }] : [];
        const listenerSpecs = role === 'PARENT'
            ? [
                ...(user.studentId ? [{ key: 'students', source: schoolRef(`students/${user.studentId}`), map: (snapshot: any) => singleRow(snapshot, String(user.studentId)) }] : []),
                ...(user.studentId ? [{ key: 'attendance', source: schoolRef(`attendanceByStudent/${user.studentId}`), map: (snapshot: any) => collectionRows(snapshot.val()).map((row: any) => ({ ...row, status: row.status })) }] : []),
                { key: 'fees', source: query(schoolRef('fees'), orderByChild('parentUid'), equalTo(user.id)), map: (snapshot: any) => collectionRows(snapshot.val()) },
                ...(user.studentAdmissionNumber ? [{ key: 'fees', source: query(schoolRef('fees'), orderByChild('studentAdmissionNumber'), equalTo(user.studentAdmissionNumber)), map: (snapshot: any) => collectionRows(snapshot.val()) }] : []),
                ...(user.studentClass ? [{ key: 'assignments', source: query(schoolRef('assignments'), orderByChild('targetClass'), equalTo(user.studentClass)), map: (snapshot: any) => collectionRows(snapshot.val()) }] : []),
                ...(user.studentId ? [{ key: 'reportCards', source: query(schoolRef('reportCards'), orderByChild('studentId'), equalTo(user.studentId)), map: (snapshot: any) => collectionRows(snapshot.val()) }] : []),
                { key: 'notifications', source: query(schoolRef('notifications'), orderByChild(`participants/${user.id}`), equalTo(true)), map: (snapshot: any) => collectionRows(snapshot.val()) },
                { key: 'settings', source: schoolRef('settings'), map: (snapshot: any) => snapshot.val() || {} },
            ]
            : [
                ...(user.assignedClass ? [{ key: 'students', source: query(schoolRef('students'), orderByChild('currentClass'), equalTo(user.assignedClass)), map: (snapshot: any) => collectionRows(snapshot.val()) }] : []),
                ...(user.assignedClass ? [{ key: 'attendance', source: schoolRef(`attendance/${user.assignedClass}`), map: (snapshot: any) => snapshot.val() || {} }] : []),
                ...(user.assignedClass ? [{ key: 'assignments', source: query(schoolRef('assignments'), orderByChild('targetClass'), equalTo(user.assignedClass)), map: (snapshot: any) => collectionRows(snapshot.val()) }] : []),
                ...(user.assignedClass ? [{ key: 'grades', source: query(schoolRef('grades'), orderByChild('classId'), equalTo(user.assignedClass)), map: (snapshot: any) => collectionRows(snapshot.val()) }] : []),
                ...(user.assignedClass ? [{ key: 'reportCards', source: query(schoolRef('reportCards'), orderByChild('classId'), equalTo(user.assignedClass)), map: (snapshot: any) => collectionRows(snapshot.val()) }] : []),
                { key: 'subjects', source: query(schoolRef('subjects'), orderByChild('teacherId'), equalTo(user.id)), map: (snapshot: any) => collectionRows(snapshot.val()) },
                { key: 'subjects', source: query(schoolRef('subjects'), orderByChild('teacherUid'), equalTo(user.id)), map: (snapshot: any) => collectionRows(snapshot.val()) },
                { key: 'notifications', source: query(schoolRef('notifications'), orderByChild(`participants/${user.id}`), equalTo(true)), map: (snapshot: any) => collectionRows(snapshot.val()) },
                { key: 'settings', source: schoolRef('settings'), map: (snapshot: any) => snapshot.val() || {} },
            ];
        const slices: Record<number, { key: string; value: any }> = {};

        listenerSpecs.forEach((spec, index) => onValue(spec.source, (snapshot) => {
            slices[index] = { key: spec.key, value: spec.map(snapshot) };
            const grouped = Object.values(slices).reduce((state: Record<string, any[]>, slice) => {
                if (Array.isArray(slice.value)) {
                    state[slice.key] = [...(state[slice.key] || []), ...slice.value];
                } else {
                    (state as any)[slice.key] = slice.value;
                }
                return state;
            }, {});
            Object.keys(grouped).forEach((key) => {
                if (Array.isArray(grouped[key])) grouped[key] = mergeRows([grouped[key]]);
            });
            setData(buildSummary(grouped, user.role, user));
            setError(null);
            setIsLoading(false);
        }, (err) => {
            setError(err);
            setIsLoading(false);
        }));

        return () => listenerSpecs.forEach((spec) => off(spec.source));
    }, [user?.id, user?.role, user?.schoolId, user?.assignedClass, user?.studentAdmissionNumber, user?.studentId, user?.studentClass]);

    return { data, isLoading, error };
};
