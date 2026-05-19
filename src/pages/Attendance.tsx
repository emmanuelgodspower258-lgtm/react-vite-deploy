import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useGetAttendanceQuery, useMarkAttendanceMutation } from '../attendanceApi';
import { useGetStudentsQuery } from '../studentsApi';
import { useAuth } from '../context/AuthContext';
import { useCollection, useCreateMutation } from '../services/firestoreHooks';
import { isParentRole, participantsFromUsers } from '../services/audience';

export const Attendance = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceState, setAttendanceState] = useState<Record<string, string>>({});
    const [isLocked, setIsLocked] = useState(false);
    
    const { data: students = [], isLoading: isLoadingStudents } = useGetStudentsQuery();
    const { data: attendanceList = [], isLoading: isLoadingAttendance } = useGetAttendanceQuery();
    const { data: users = [] } = useCollection('users');
    const [markAttendance, { isLoading: isSaving }] = useMarkAttendanceMutation();
    const [createNotification] = useCreateMutation('notifications');

    const isLoading = isLoadingStudents || isLoadingAttendance;

    // Use the actual class assigned to the user profile
    const assignedClass = user?.assignedClass || '';
    let myClassStudents = students.filter((s: any) => s.classId === assignedClass || s.currentClass === assignedClass);

    // Check if attendance is already locked for the selected date
    useEffect(() => {
        const existingRecord = attendanceList.find((r: any) => r.date === selectedDate && r.class === assignedClass);
        if (existingRecord && existingRecord.isLocked) {
            setIsLocked(true);
            setAttendanceState(existingRecord.records || {});
        } else {
            setIsLocked(false);
            const initialState: Record<string, string> = {};
            myClassStudents.forEach((s: any) => { initialState[s.id] = 'present'; });
            setAttendanceState(initialState);
        }
    }, [selectedDate, attendanceList, myClassStudents.length, assignedClass]);

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 font-semibold text-sm">Syncing Attendance Records...</p>
                </div>
            </div>
        );
    }

    const handleSave = async () => {
        if (isLocked) return;
        try {
            await markAttendance({
                date: selectedDate,
                classId: assignedClass,
                recordedBy: user?.id,
                records: attendanceState,
                isLocked: true
            }).unwrap();
            
            setIsLocked(true);
            toast.success('Register locked and saved securely!');
            const parentRecipients = users.filter((account: any) => isParentRole(account.role) && myClassStudents.some((student: any) => student.parentUid === account.id || student.admissionNumber === account.studentAdmissionNumber));
            await createNotification({
                type: 'BROADCAST',
                audience: `${assignedClass}_PARENTS`,
                category: 'ATTENDANCE',
                title: `Attendance submitted for ${assignedClass}`,
                content: `Attendance for ${assignedClass} on ${selectedDate} has been submitted.`,
                message: `Attendance for ${assignedClass} on ${selectedDate} has been submitted.`,
                author: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'School',
                role: user?.role || 'Teacher',
                avatar: 'AT',
                timestamp: new Date().toISOString(),
                participants: participantsFromUsers(parentRecipients),
                readBy: {},
                likedBy: {},
                likes: 0,
            }).unwrap();
            setTimeout(() => toast.success('Notifications dispatched to parents.', { icon: '📲' }), 800);
        } catch (err) {
            toast.error('Failed to save attendance.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
            {isOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setIsOpen(false)} />}
            <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

            <div className={`transition-all duration-500 ${isOpen ? 'lg:ml-64' : 'ml-0'} flex flex-col min-h-screen`}>
                <Navbar toggleSidebar={() => setIsOpen(!isOpen)} userRole="School Administrator" />

                <main className="flex-1 p-6 lg:p-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">Daily Heartbeat</h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Official daily register. Submitting will lock the record and notify parents.</p>
                        </div>
                        <div className="flex items-center space-x-3 bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <span className="pl-4 font-bold text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wider">Date:</span>
                            <input 
                                type="date" 
                                value={selectedDate} 
                                onChange={(e) => setSelectedDate(e.target.value)} 
                                max={new Date().toISOString().split('T')[0]}
                                className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-xl font-bold outline-none border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-orange-500" 
                            />
                        </div>
                    </div>
                    
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-orange-100 text-orange-600 dark:bg-orange-900/30 flex items-center justify-center rounded-xl font-black text-xl">J1</div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">JSS 1 <span className="font-medium text-gray-400 mx-2">|</span> Form Master Register</h2>
                                    <p className="text-sm font-semibold text-gray-500">{myClassStudents.length} Students Enrolled</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                {isLocked && (
                                    <span className="flex items-center text-sm font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-xl">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                        Locked & Sent
                                    </span>
                                )}
                                <button onClick={handleSave} disabled={isSaving || isLocked} className={`px-6 py-3 rounded-xl font-bold shadow-sm transition-all flex items-center ${isLocked ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 text-white hover:shadow-md'}`}>
                                    {isSaving ? 'Locking...' : isLocked ? 'Register Closed' : 'Lock & Submit Register'}
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm border-b border-gray-100 dark:border-gray-700">
                                    <tr>
                                        <th className="p-5 font-semibold">Student Profile</th>
                                        <th className="p-5 font-semibold text-right">Attendance Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                                    {isLoading ? (
                                        <tr><td colSpan={2} className="p-8 text-center font-semibold text-gray-500">Loading class register...</td></tr>
                                    ) : myClassStudents.length === 0 ? (
                                        <tr><td colSpan={2} className="p-8 text-center font-semibold text-gray-500">No students found in this class.</td></tr>
                                    ) : myClassStudents.map((student: any) => (
                                        <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="p-5 flex items-center space-x-4">
                                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm uppercase">{student.firstName?.[0]}{student.lastName?.[0]}</div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white text-base">{student.firstName} {student.lastName}</p>
                                                    <p className="text-xs text-gray-500 font-medium">{student.admissionNumber}</p>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <div className="flex justify-end space-x-2">
                                                    {[
                                                        { id: 'present', label: 'Present', activeClass: 'bg-green-500 text-white border-green-500 shadow-md', inactiveClass: 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-600 hover:border-green-400 hover:text-green-600' },
                                                        { id: 'absent', label: 'Absent', activeClass: 'bg-red-500 text-white border-red-500 shadow-md', inactiveClass: 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-600 hover:border-red-400 hover:text-red-600' }
                                                    ].map(status => (
                                                        <button key={status.id} disabled={isLocked} onClick={() => setAttendanceState(prev => ({ ...prev, [student.id]: status.id }))} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all duration-200 ${attendanceState[student.id] === status.id ? status.activeClass : status.inactiveClass} ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                                            {status.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </main>
            </div>
        </div>
    );
};
