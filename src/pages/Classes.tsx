import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGetClassesQuery, useCreateClassMutation, useUpdateClassMutation, useDeleteClassMutation } from '../classesApi';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAuth } from '../context/AuthContext';

interface Class {
    id: string;
    name: string;
    grade: string;
    section: string;
    capacity: number;
    teacherId?: string;
    teacherName?: string;
    studentCount: number;
    createdAt: string;
}

export const Classes = () => {
    const [isOpen, setIsOpen] = useState(true);
    const { user } = useAuth();
    const [userRole, setUserRole] = useState<string>('Loading...');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingClass, setEditingClass] = useState<Class | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        grade: '',
        section: '',
        capacity: 30,
        teacherId: ''
    });

    // Decode JWT token to get user role
    useEffect(() => {
        if (user?.role) {
            setUserRole(user.role.replace('_', ' ').replace(/\w\S*/g, (txt: string) =>
                txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()));
        }

        // Auto close sidebar on mobile
        const handleResize = () => {
            if (window.innerWidth < 1024) setIsOpen(false);
            else setIsOpen(true);
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, [user?.role]);

    const { data: classes = [], isLoading } = useGetClassesQuery(undefined);
    const [createClass, { isLoading: isCreating }] = useCreateClassMutation();
    const [updateClass, { isLoading: isUpdating }] = useUpdateClassMutation();
    const [deleteClass, { isLoading: isDeleting }] = useDeleteClassMutation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingClass) {
                await updateClass({ id: editingClass.id, ...formData }).unwrap();
            } else {
                await createClass(formData).unwrap();
            }
            setShowCreateModal(false);
            setEditingClass(null);
            setFormData({ name: '', grade: '', section: '', capacity: 30, teacherId: '' });
        } catch (error) {
            console.error('Failed to save class:', error);
        }
    };

    const handleEdit = (classItem: Class) => {
        setEditingClass(classItem);
        setFormData({
            name: classItem.name,
            grade: classItem.grade,
            section: classItem.section,
            capacity: classItem.capacity,
            teacherId: classItem.teacherId || ''
        });
        setShowCreateModal(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this class?')) {
            try {
                await deleteClass(id).unwrap();
            } catch (error) {
                console.error('Failed to delete class:', error);
            }
        }
    };

    const resetForm = () => {
        setShowCreateModal(false);
        setEditingClass(null);
        setFormData({ name: '', grade: '', section: '', capacity: 30, teacherId: '' });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 transition-all duration-500">
            {/* Dark overlay for mobile */}
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
            <div className={`transition-all duration-500 ${isOpen ? 'lg:ml-64' : 'ml-0'} flex flex-col min-h-screen`}>
                <Navbar toggleSidebar={() => setIsOpen(!isOpen)} userRole={userRole} />

                <main className="flex-1 p-6 lg:p-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="max-w-7xl mx-auto"
                    >
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
                            <div>
                                <h1 className="text-4xl font-black text-gray-800 dark:text-white mb-2 tracking-tight">
                                    Class Management
                                </h1>
                                <p className="text-gray-600 dark:text-gray-300 text-lg">
                                    Manage your school's classes and sections
                                </p>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowCreateModal(true)}
                                className="mt-4 sm:mt-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300 flex items-center space-x-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Add New Class</span>
                            </motion.button>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            {[
                                { title: 'Total Classes', value: classes.length, color: 'from-blue-500 to-blue-600', icon: '🏫' },
                                { title: 'Active Students', value: classes.reduce((acc: number, cls: Class) => acc + (cls.studentCount || 0), 0), color: 'from-green-500 to-green-600', icon: '👥' },
                                { title: 'Available Capacity', value: classes.reduce((acc: number, cls: Class) => acc + (cls.capacity - (cls.studentCount || 0)), 0), color: 'from-purple-500 to-purple-600', icon: '📊' }
                            ].map((stat, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    whileHover={{ y: -5 }}
                                    className={`bg-gradient-to-r ${stat.color} rounded-2xl p-6 text-white shadow-xl`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-white/80 text-sm font-medium mb-1">{stat.title}</p>
                                            <p className="text-3xl font-black">{stat.value}</p>
                                        </div>
                                        <div className="text-4xl">{stat.icon}</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Classes Grid */}
                        {isLoading ? (
                            <div className="flex justify-center items-center py-20">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full"
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {classes.map((classItem: Class, index: number) => (
                                    <motion.div
                                        key={classItem.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.1 }}
                                        whileHover={{ y: -8, scale: 1.02 }}
                                        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-700 hover:shadow-2xl transition-all duration-300"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
                                                    {classItem.name}
                                                </h3>
                                                <p className="text-gray-600 dark:text-gray-300 text-sm">
                                                    Grade {classItem.grade} - Section {classItem.section}
                                                </p>
                                            </div>
                                            <div className="flex space-x-2">
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleEdit(classItem)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleDelete(classItem.id)}
                                                    disabled={isDeleting}
                                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </motion.button>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600 dark:text-gray-400">Students</span>
                                                <span className="font-semibold text-gray-800 dark:text-white">
                                                    {classItem.studentCount}/{classItem.capacity}
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(classItem.studentCount / classItem.capacity) * 100}%` }}
                                                    transition={{ duration: 0.8, delay: index * 0.1 }}
                                                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full"
                                                />
                                            </div>
                                            {classItem.teacherName && (
                                                <div className="flex items-center space-x-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                                    <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                                                        <span className="text-white text-xs font-bold">
                                                            {classItem.teacherName.split(' ').map((n: string) => n[0]).join('')}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400">Teacher</p>
                                                        <p className="text-sm font-medium text-gray-800 dark:text-white">
                                                            {classItem.teacherName}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {classes.length === 0 && !isLoading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-20"
                            >
                                <div className="text-6xl mb-4">🏫</div>
                                <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">No Classes Yet</h3>
                                <p className="text-gray-600 dark:text-gray-300 mb-6">Get started by creating your first class</p>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowCreateModal(true)}
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg"
                                >
                                    Create Your First Class
                                </motion.button>
                            </motion.div>
                        )}
                    </motion.div>
                </main>
            </div>

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={resetForm}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl"
                    >
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
                            {editingClass ? 'Edit Class' : 'Create New Class'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Class Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                    placeholder="e.g., Mathematics 101"
                                    maxLength={50}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Grade
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.grade}
                                        onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                        placeholder="e.g., 10"
                                        maxLength={20}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Section
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.section}
                                        onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                        placeholder="e.g., A"
                                        maxLength={10}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Assign Form Master
                                </label>
                                <select
                                    value={formData.teacherId || ''}
                                    onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                    required
                                >
                                    <option value="" disabled>Select a teacher from database...</option>
                                    <option value="t1">Sarah Jenkins</option>
                                    <option value="t2">Robert Doe</option>
                                    <option value="t3">Mark Davis</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Capacity
                                </label>
                                <input
                                    type="number"
                                    value={formData.capacity}
                                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                    min="1"
                                    max="100"
                                    required
                                />
                            </div>

                            <div className="flex space-x-4 pt-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={isCreating || isUpdating}
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                                >
                                    {isCreating || isUpdating ? 'Saving...' : (editingClass ? 'Update Class' : 'Create Class')}
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="button"
                                    onClick={resetForm}
                                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300"
                                >
                                    Cancel
                                </motion.button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
};
