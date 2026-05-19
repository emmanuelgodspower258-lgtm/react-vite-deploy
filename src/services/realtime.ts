import { off, onValue, push, ref, serverTimestamp, set } from 'firebase/database';
import { rtdb } from './firebase';
import { schoolPath } from './schoolPaths';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export const writeAttendance = async (
    schoolId: string,
    classId: string,
    date: string,
    records: Record<string, AttendanceStatus>,
) => {
    if (!schoolId) throw new Error('A schoolId is required to write attendance.');
    const updates = Object.entries(records).flatMap(([studentId, status]) => {
        const normalizedStatus = String(status).toLowerCase();
        return [
            set(ref(rtdb, `${schoolPath(schoolId, 'attendance')}/${classId}/${date}/${studentId}`), normalizedStatus),
            set(ref(rtdb, `${schoolPath(schoolId, 'attendanceByStudent')}/${studentId}/${date}`), {
                classId,
                date,
                studentId,
                status: normalizedStatus,
            }),
        ];
    });
    await Promise.all(updates);
    return records;
};

export const listenToAttendance = (
    schoolId: string,
    classId: string,
    date: string,
    callback: (records: Record<string, string>) => void,
) => {
    const attendanceRef = ref(rtdb, `${schoolPath(schoolId, 'attendance')}/${classId}/${date}`);
    onValue(attendanceRef, (snapshot) => callback(snapshot.val() || {}));
    return () => off(attendanceRef);
};

export const pushReply = async (schoolId: string, notificationId: string, reply: Record<string, unknown>) => {
    const replyRef = push(ref(rtdb, `${schoolPath(schoolId, 'notifications')}/${notificationId}/replies`));
    await set(replyRef, {
        ...reply,
        createdAt: serverTimestamp(),
    });
    return replyRef.key;
};

export const listenToReplies = (
    schoolId: string,
    notificationId: string,
    callback: (replies: Array<Record<string, unknown> & { id: string }>) => void,
) => {
    const repliesRef = ref(rtdb, `${schoolPath(schoolId, 'notifications')}/${notificationId}/replies`);
    onValue(repliesRef, (snapshot) => {
        const value = snapshot.val() || {};
        callback(Object.entries(value).map(([id, data]) => ({ id, ...(data as Record<string, unknown>) })));
    });
    return () => off(repliesRef);
};
