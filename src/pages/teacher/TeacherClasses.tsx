import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useGetStudentsQuery } from '../../studentsApi';
import { useAuth } from '../../context/AuthContext';
import { useMarkAttendanceMutation } from '../../attendanceApi';

export const TeacherClasses = () => {
    const { user } = useAuth();
    const [selectedClass, setSelectedClass] = useState(user?.assignedClass || '');
    const [students, setStudents] = useState<any[]>([]);

    const { data: allStudents = [], isLoading } = useGetStudentsQuery();
    const [markAttendanceRegister] = useMarkAttendanceMutation();

    useEffect(() => {
        if (!selectedClass && user?.assignedClass) setSelectedClass(user.assignedClass);
    }, [selectedClass, user?.assignedClass]);

    // Load students dynamically from Firebase
    useEffect(() => {
        const filtered = allStudents.filter((s: any) => s.currentClass === selectedClass || s.classId === selectedClass);
        setStudents(filtered.map((s: any) => ({ ...s, name: `${s.firstName} ${s.lastName}`, attendance: s.attendance || 'UNMARKED' })));
    }, [selectedClass, allStudents]);

    const markAttendance = async (studentId: string, status: string) => {
        try {
            toast.success(`Marked ${status}`);
            setStudents(students.map(s => s.id === studentId ? { ...s, attendance: status } : s));
        } catch (e) {
            toast.error("Failed to mark attendance.");
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 dark:text-white">Class & Attendance</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Select a class to view students and mark daily attendance.</p>
                </div>
                <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full md:w-64 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-orange-500">
                    <option value={user?.assignedClass || ''}>{user?.assignedClass || 'No Class Assigned'}</option>
                </select>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Student List ({students.length})</h2>
                    <button onClick={async () => {
                        if (!user?.schoolId) {
                            toast.error('Your teacher profile has no school assigned.');
                            return;
                        }
                        await markAttendanceRegister({
                            classId: selectedClass,
                            date: new Date().toISOString().split('T')[0],
                            records: Object.fromEntries(students.map(s => [s.id, String(s.attendance || 'absent').toLowerCase()])),
                            recordedBy: user.id,
                        }).unwrap();
                        toast.success("Attendance saved to database!");
                    }} className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-xl font-bold shadow-md transition-all">Submit Attendance</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm">
                            <tr><th className="p-4 font-semibold">Student Name</th><th className="p-4 font-semibold">Current Status</th><th className="p-4 font-semibold text-right">Quick Actions</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                            {students.map((student) => (
                                <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="p-4 font-bold text-gray-900 dark:text-white">{student.name}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-black ${student.attendance === 'PRESENT' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : student.attendance === 'ABSENT' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' : 'bg-gray-100 text-gray-700 dark:bg-gray-700'}`}>
                                            {student.attendance || 'UNMARKED'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right space-x-2">
                                        <button onClick={() => markAttendance(student.id, 'PRESENT')} className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-600 dark:bg-green-900/20 dark:hover:bg-green-900/40 rounded-lg text-sm font-bold transition-colors">Present</button>
                                        <button onClick={() => markAttendance(student.id, 'ABSENT')} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg text-sm font-bold transition-colors">Absent</button>
                                        <button onClick={() => toast("Profile opened")} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-sm font-bold transition-colors">Profile</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
};
