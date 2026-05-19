import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useGetStudentsQuery } from '../../studentsApi';
import { useGetAttendanceQuery } from '../../attendanceApi';

export const ParentAttendance = () => {
    const { user } = useAuth();
    const { data: students = [] } = useGetStudentsQuery();
    const { data: attendance = [] } = useGetAttendanceQuery();
    const child = students.find((student: any) => student.admissionNumber === user?.studentAdmissionNumber || student.parentUid === user?.id);
    const rows = attendance.filter((record: any) => child && record.records?.[child.id]);
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
                <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white">Attendance Records</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Track your child's daily school attendance.</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">{child ? `${child.firstName} ${child.lastName} - ${child.currentClass || child.classId}` : 'No linked student'}</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 text-sm">
                            <tr>
                                <th className="p-4 font-semibold">Date</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold">Remarks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                            {rows.length === 0 ? <tr><td colSpan={3} className="p-4 text-center text-gray-500 font-semibold">No attendance records found.</td></tr> : rows.map((record: any) => {
                                const status = record.records[child.id];
                                return (
                                    <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="p-4 font-medium">{record.date}</td>
                                        <td className="p-4"><span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-bold tracking-wide">{String(status).toUpperCase()}</span></td>
                                        <td className="p-4 text-sm text-gray-500"></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
};
