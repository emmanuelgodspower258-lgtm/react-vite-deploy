import { useEffect, useState } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { createDoc, logActivity } from './services/firestore';
import { rtdb } from './services/firebase';
import { writeAttendance } from './services/realtime';
import { useAuth } from './context/AuthContext';
import { normalizeClassName, schoolPath } from './services/schoolPaths';

export const useGetAttendanceQuery = () => {
    const { user } = useAuth();
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        setIsLoading(true);
        if (!user?.schoolId) {
            setData([]);
            setIsLoading(false);
            return;
        }
        const role = String(user.role || '').toUpperCase();
        const assignedClass = user.assignedClass || '';
        const attendancePath = role === 'TEACHER' && assignedClass
            ? `${schoolPath(user.schoolId, 'attendance')}/${assignedClass}`
            : role === 'PARENT' && user.studentId
                ? `${schoolPath(user.schoolId, 'attendanceByStudent')}/${user.studentId}`
                : schoolPath(user.schoolId, 'attendance');
        const attendanceRef = ref(rtdb, attendancePath);
        onValue(attendanceRef, (snapshot) => {
            const value = snapshot.val() || {};
            const records: any[] = [];
            if (role === 'PARENT') {
                Object.entries(value as Record<string, any>).forEach(([date, record]) => {
                    records.push({
                        id: `${record.classId || user.studentClass || 'class'}-${date}`,
                        class: record.classId || user.studentClass || '',
                        classId: record.classId || user.studentClass || '',
                        date,
                        records: { [user.studentId || '']: record.status },
                        isLocked: true,
                    });
                });
            } else if (role === 'TEACHER' && assignedClass) {
                Object.entries(value as Record<string, Record<string, string>>).forEach(([date, studentRecords]) => {
                    records.push({
                        id: `${assignedClass}-${date}`,
                        class: assignedClass,
                        classId: assignedClass,
                        date,
                        records: studentRecords,
                        isLocked: true,
                    });
                });
            } else {
                Object.entries(value).forEach(([classId, dates]) => {
                    Object.entries(dates as Record<string, Record<string, string>>).forEach(([date, studentRecords]) => {
                        records.push({
                            id: `${classId}-${date}`,
                            class: classId,
                            classId,
                            date,
                            records: studentRecords,
                            isLocked: true,
                        });
                    });
                });
            }
            const visibleRecords = records.filter((record) => {
                if (['ADMIN', 'PRINCIPAL', 'SUPER_ADMIN'].includes(role)) return true;
                if (role === 'TEACHER') return normalizeClassName(record.classId) === normalizeClassName(user.assignedClass);
                if (role === 'PARENT') return Boolean(record.records?.[user.studentId || '']);
                return false;
            });
            setData(visibleRecords);
            setIsLoading(false);
        }, (err) => {
            setError(err);
            setIsLoading(false);
        });

        return () => off(attendanceRef);
    }, [user?.id, user?.role, user?.schoolId, user?.assignedClass, user?.studentId]);

    return { data, isLoading, error };
};

export const useMarkAttendanceMutation = () => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const mutate = (payload: any) => ({
        unwrap: async () => {
            setIsLoading(true);
            try {
                const classId = payload.classId || payload.class;
                const role = String(user?.role || '').toUpperCase();
                const canWrite = ['ADMIN', 'PRINCIPAL'].includes(role) || (role === 'TEACHER' && normalizeClassName(user?.assignedClass) === normalizeClassName(classId));
                if (!user?.schoolId || !canWrite) throw new Error('You cannot write attendance for this class.');
                await writeAttendance(user.schoolId, classId, payload.date, payload.records);
                await createDoc(schoolPath(user.schoolId, 'attendanceLocks'), {
                    classId,
                    class: classId,
                    date: payload.date,
                    recordedBy: payload.recordedBy,
                    records: payload.records,
                    isLocked: true,
                    schoolId: user.schoolId,
                }, `${classId}_${payload.date}`.replace(/[.#$/[\]]/g, '_'));
                await logActivity('attendance_taken', 'attendance', {
                    schoolId: user.schoolId,
                    classId,
                    date: payload.date,
                    message: `Attendance taken for ${classId} on ${payload.date}`,
                });
                return payload;
            } finally {
                setIsLoading(false);
            }
        },
    });

    return [mutate, { isLoading }] as const;
};
