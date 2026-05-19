import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useGetAssignmentsQuery, useCreateAssignmentMutation } from '../assignmentsApi';

export const Assignments = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const { data: assignmentsList = [], isLoading } = useGetAssignmentsQuery();
    const [createAssignment, { isLoading: isCreating }] = useCreateAssignmentMutation();

    const [formData, setFormData] = useState({
        title: '', targetClass: '', subject: '', dueDate: '', description: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createAssignment(formData).unwrap();
            setShowModal(false);
            setFormData({ title: '', targetClass: '', subject: '', dueDate: '', description: '' });
            toast.success('Assignment published successfully!');
        } catch (err) {
            toast.error('Failed to publish assignment.');
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
            {isOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setIsOpen(false)} />}
            <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

            <div className={`transition-all duration-500 ${isOpen ? 'lg:ml-64' : 'ml-0'} flex flex-col min-h-screen`}>
                <Navbar toggleSidebar={() => setIsOpen(!isOpen)} userRole="School Administrator" />

                <main className="flex-1 p-6 lg:p-8">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white">Assignments</h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage homework, projects, and class assignments.</p>
                        </div>
                        <button onClick={() => setShowModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md transition-all">
                            + Create Assignment
                        </button>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Active Assignments</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                                    <tr>
                                        <th className="p-4 font-semibold text-sm">Title & Description</th>
                                        <th className="p-4 font-semibold text-sm">Class</th>
                                        <th className="p-4 font-semibold text-sm">Subject</th>
                                        <th className="p-4 font-semibold text-sm">Due Date</th>
                                        <th className="p-4 font-semibold text-sm">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                                    {isLoading ? (
                                        <tr><td colSpan={5} className="p-4 text-center font-semibold text-gray-500">Loading assignments...</td></tr>
                                    ) : assignmentsList.length === 0 ? (
                                        <tr><td colSpan={5} className="p-4 text-center font-semibold text-gray-500">No assignments found.</td></tr>
                                    ) : assignmentsList.map((assignment: any) => (
                                        <tr key={assignment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="p-4">
                                                <p className="font-bold text-gray-800 dark:text-white">{assignment.title}</p>
                                                <p className="text-xs text-gray-500 truncate max-w-xs">{assignment.description}</p>
                                            </td>
                                            <td className="p-4 font-medium"><span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">{assignment.targetClass}</span></td>
                                            <td className="p-4 font-semibold">{assignment.subject}</td>
                                            <td className="p-4 font-semibold text-rose-500">{assignment.dueDate}</td>
                                            <td className="p-4"><span className="px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-bold tracking-wide uppercase">ACTIVE</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>

            {/* Create Assignment Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-gray-100 dark:border-gray-700">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Create Assignment</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <input type="text" required placeholder="Assignment Title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} maxLength={100} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" required placeholder="Class (e.g. JSS 1)" value={formData.targetClass} onChange={(e) => setFormData({...formData, targetClass: e.target.value})} maxLength={50} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                    <input type="text" required placeholder="Subject (e.g. Math)" value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} maxLength={50} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Due Date</label>
                                    <input type="date" required value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                </div>
                                <textarea required placeholder="Assignment Description & Instructions..." rows={4} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} maxLength={500} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none resize-none"></textarea>
                                <div className="flex space-x-4 pt-4">
                                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-3 rounded-xl font-bold transition-colors">Cancel</button>
                                    <button type="submit" disabled={isCreating} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-colors shadow-md disabled:opacity-70">
                                        {isCreating ? 'Publishing...' : 'Publish'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};