import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useCollection, useCreateMutation } from '../../services/firestoreHooks';
import { isParentRole, participantsFromUsers } from '../../services/audience';
import { useStudentSearch } from '../../services/searchService';

export const TeacherStudents = () => {
    const { user } = useAuth();
    const { data: users = [] } = useCollection('users');
    const [createNotification] = useCreateMutation('notifications');
    const [search, setSearch] = useState('');
    const { results: studentSearchResults } = useStudentSearch(search, { classId: user?.assignedClass || '' });
    const filteredStudents = studentSearchResults.map((result) => result.record);

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white">My Students</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">View profiles and send behavioral reports to parents.</p>
                </div>
                <div className="flex w-full md:w-auto">
                    <input type="text" placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none shadow-sm" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStudents.map((student: any) => (
                <motion.div key={student.id} whileHover={{ y: -5 }} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center space-x-4 mb-6">
                        <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xl">{student.firstName?.[0]}{student.lastName?.[0]}</div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">{student.firstName} {student.lastName}</h3>
                            <p className="text-sm text-gray-500 font-medium">{student.currentClass || student.classId}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-600">
                            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Attendance</p>
                            <p className="text-lg font-black text-green-500">{student.attendancePercentage || 0}%</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-600">
                            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Average</p>
                            <p className="text-lg font-black text-blue-500">{student.averageScore || 0}%</p>
                        </div>
                    </div>
                    <div className="flex space-x-3">
                        <button className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-2 rounded-xl font-bold transition-colors text-sm">View Profile</button>
                        <button onClick={async () => {
                            const recipients = users.filter((account: any) => isParentRole(account.role) && (student.parentUid === account.id || student.admissionNumber === account.studentAdmissionNumber));
                            await createNotification({
                                type: 'DIRECT',
                                category: 'STUDENT_REPORT',
                                title: `Student report for ${student.firstName} ${student.lastName}`,
                                content: `A new student report has been sent for ${student.firstName} ${student.lastName}.`,
                                message: `A new student report has been sent for ${student.firstName} ${student.lastName}.`,
                                author: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Teacher',
                                role: user?.role || 'Teacher',
                                avatar: 'TR',
                                timestamp: new Date().toISOString(),
                                participants: participantsFromUsers(recipients),
                                readBy: {},
                                likedBy: {},
                                likes: 0,
                            }).unwrap();
                            toast.success('Report sent to parent!');
                        }} className="flex-1 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/30 py-2 rounded-xl font-bold transition-colors text-sm">Send Report</button>
                    </div>
                </motion.div>
                ))}
            </div>

        </motion.div>
    );
};
