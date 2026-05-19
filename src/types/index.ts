export type Role = 'ADMIN' | 'SUPER_ADMIN' | 'PRINCIPAL' | 'TEACHER' | 'ACCOUNTANT' | 'PARENT' | 'STUDENT';

export interface User {
    id: string;
    email: string;
    role: Role;
    firstName?: string;
    lastName?: string;
    schoolId?: string;
    schoolName?: string;
    classId?: string;
    assignedClass?: string;
    assignedSubjects?: string[];
    studentAdmissionNumber?: string;
    studentId?: string;
    studentClass?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

export interface RealtimeEvent {
    type: 'ATTENDANCE_UPDATE' | 'NEW_RESULT' | 'ANNOUNCEMENT' | 'NEW_MESSAGE';
    payload: any;
}
