import React from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useGetStudentsQuery } from '../../studentsApi';
import { useGetAssignmentsQuery } from '../../assignmentsApi';
import { useCreateMutation } from '../../services/firestoreHooks';

export const ParentAssignments = () => {
    const { user } = useAuth();
    const { data: students = [] } = useGetStudentsQuery();
    const { data: assignments = [] } = useGetAssignmentsQuery();
    const [submitAssignment] = useCreateMutation('assignmentSubmissions');
    const child = students.find((student: any) => student.admissionNumber === user?.studentAdmissionNumber || student.parentUid === user?.id);
    const childAssignments = assignments.filter((assignment: any) => child && assignment.targetClass === (child.currentClass || child.classId));
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white mb-6">Homework & Assignments</h1>

            <div className="grid grid-cols-1 gap-6">
                {childAssignments.length === 0 ? <p className="text-sm text-gray-500">No assignments found for your child.</p> : childAssignments.map((assignment: any) => (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center hover:-translate-y-1 transition-transform">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-orange-100 text-orange-600 dark:bg-orange-900/30 text-xs font-black px-3 py-1 rounded-md uppercase tracking-wider">{assignment.subject}</span>
                            <span className="text-sm font-bold text-red-500">{assignment.dueDate}</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{assignment.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">{assignment.description}</p>
                    </div>
                    
                    <div className="w-full md:w-auto bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600 shrink-0">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-3 text-center">Submission Portal</p>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => toast.success('File upload dialog opened.')} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-500 hover:border-orange-500 text-gray-700 dark:text-gray-200 py-2 px-6 rounded-lg text-sm font-bold transition-colors">
                                📎 Upload Document
                            </button>
                            <button onClick={async () => {
                                await submitAssignment({
                                    assignmentId: assignment.id,
                                    studentId: child?.id || '',
                                    studentAdmissionNumber: child?.admissionNumber || user?.studentAdmissionNumber || '',
                                    parentUid: user?.id || '',
                                    status: 'SUBMITTED',
                                    submittedAt: new Date().toISOString(),
                                }).unwrap();
                                toast.success('Assignment Submitted!');
                            }} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-6 rounded-lg text-sm font-bold transition-colors shadow-sm">
                                Submit Work
                            </button>
                        </div>
                    </div>
                </div>
                ))}
            </div>
        </motion.div>
    );
};
