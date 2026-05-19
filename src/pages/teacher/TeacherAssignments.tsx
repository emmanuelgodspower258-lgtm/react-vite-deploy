import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useGetAssignmentsQuery, useCreateAssignmentMutation } from '../../assignmentsApi';

export const TeacherAssignments = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('Create');
    const [formData, setFormData] = useState({ title: '', description: '', dueDate: '' });
    const { data: assignments = [] } = useGetAssignmentsQuery();
    const [createAssignment, { isLoading }] = useCreateAssignmentMutation();
    const myAssignments = assignments.filter((assignment: any) => assignment.teacherId === user?.id || assignment.targetClass === user?.assignedClass);

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white">Assignments</h1>
            
            <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
                {['Create', 'Active & Submissions'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 px-4 font-semibold transition-colors ${activeTab === tab ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>{tab}</button>
                ))}
            </div>

            {activeTab === 'Create' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 max-w-3xl">
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        await createAssignment({
                            ...formData,
                            targetClass: user?.assignedClass || '',
                            subject: user?.assignedSubjects?.[0] || '',
                            teacherId: user?.id,
                            status: 'ACTIVE',
                        }).unwrap();
                        setFormData({ title: '', description: '', dueDate: '' });
                        toast.success('Assignment published to students!');
                    }} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Class</label>
                                <select className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"><option>{user?.assignedClass || 'No Class Assigned'}</option></select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Subject</label>
                                <select className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none">{(user?.assignedSubjects || []).map(subject => <option key={subject}>{subject}</option>)}</select>
                            </div>
                        </div>
                        <input type="text" required placeholder="Assignment Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none font-bold text-lg" />
                        <textarea required rows={5} placeholder="Instructions..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"></textarea>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Due Date</label>
                            <input type="date" required value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold shadow-md transition-all disabled:opacity-70">Publish Assignment</button>
                    </form>
                </div>
            )}

            {activeTab === 'Active & Submissions' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {myAssignments.length === 0 ? <p className="text-sm text-gray-500">No active assignments yet.</p> : myAssignments.map((assignment: any) => (
                    <motion.div key={assignment.id} whileHover={{ y: -5 }} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-gray-800 dark:text-white">{assignment.title}</h3>
                                <p className="text-sm text-gray-500">{assignment.targetClass} • {assignment.subject}</p>
                            </div>
                            <span className="bg-orange-100 text-orange-600 dark:bg-orange-900/30 text-xs font-bold px-2 py-1 rounded">{assignment.dueDate}</span>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">12 / 30 Submitted</p>
                            <button className="text-orange-500 font-bold text-sm hover:underline">Grade Submissions &rarr;</button>
                        </div>
                    </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
};
