import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { initializeApp, deleteApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { ref, update } from 'firebase/database';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useCreateSchoolMutation, useGetSchoolsQuery } from '../schoolApi';
import { auth, rtdb } from '../services/firebase';
import { logActivity } from '../services/firestore';

const emptyForm = {
    schoolName: '',
    schoolCode: '',
    address: '',
    phone: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
};

export const Schools = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState(emptyForm);
    const { data: schools = [], isLoading } = useGetSchoolsQuery();
    const [createSchool, { isLoading: isCreatingSchool }] = useCreateSchoolMutation();

    const filteredSchools = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return schools;
        return schools.filter((school: any) =>
            `${school.name || ''} ${school.code || ''} ${school.adminEmail || ''}`.toLowerCase().includes(query)
        );
    }, [schools, searchQuery]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        try {
            const schoolPayload = {
                name: formData.schoolName.trim(),
                code: formData.schoolCode.trim().toUpperCase(),
                address: formData.address.trim(),
                phone: formData.phone.trim(),
                status: 'ACTIVE',
                adminEmail: formData.adminEmail.trim(),
            };
            const school = await createSchool(schoolPayload).unwrap();

            const secondaryApp = initializeApp(auth.app.options, `school-admin-${Date.now()}`);
            const secondaryAuth = getAuth(secondaryApp);
            const credential = await createUserWithEmailAndPassword(secondaryAuth, formData.adminEmail, formData.adminPassword);
            await deleteApp(secondaryApp);

            const adminProfile = {
                uid: credential.user.uid,
                email: formData.adminEmail.trim(),
                firstName: formData.adminFirstName.trim(),
                lastName: formData.adminLastName.trim(),
                role: 'ADMIN',
                schoolId: school.id,
                schoolName: schoolPayload.name,
                createdAt: new Date().toISOString(),
            };

            await update(ref(rtdb), {
                [`schools/${school.id}/users/${credential.user.uid}`]: adminProfile,
                [`userSchools/${credential.user.uid}`]: { schoolId: school.id, role: 'ADMIN' },
            });
            await logActivity('created', `schools/${school.id}/users`, { recordId: credential.user.uid, schoolId: school.id, message: `Created school admin for ${schoolPayload.name}` });

            setShowModal(false);
            setFormData(emptyForm);
            toast.success('School and school admin created successfully.');
        } catch (error: any) {
            console.error(error);
            toast.error(error?.message || 'Failed to create school.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
            {isOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setIsOpen(false)} />}
            <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

            <div className={`transition-all duration-500 ${isOpen ? 'lg:ml-64' : 'ml-0'} flex flex-col min-h-screen`}>
                <Navbar toggleSidebar={() => setIsOpen(!isOpen)} userRole="Super Admin" />

                <main className="flex-1 p-6 lg:p-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white">Schools</h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Create schools and assign each school its administrator.</p>
                        </div>
                        <button onClick={() => setShowModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md transition-all">
                            + Add School
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Total Schools</p>
                            <p className="text-4xl font-black text-gray-900 dark:text-white mt-2">{isLoading ? '...' : schools.length}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Active Schools</p>
                            <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{isLoading ? '...' : schools.filter((school: any) => school.status === 'ACTIVE').length}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Admins Assigned</p>
                            <p className="text-4xl font-black text-orange-600 dark:text-orange-400 mt-2">{isLoading ? '...' : schools.filter((school: any) => school.adminEmail).length}</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">School Directory</h2>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Search school, code, or admin..."
                                className="w-full md:w-80 px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none shadow-sm"
                            />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                                    <tr>
                                        <th className="p-4 font-semibold">School</th>
                                        <th className="p-4 font-semibold">Code</th>
                                        <th className="p-4 font-semibold">Admin</th>
                                        <th className="p-4 font-semibold">Contact</th>
                                        <th className="p-4 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                                    {isLoading ? (
                                        <tr><td colSpan={5} className="p-4 text-center font-semibold text-gray-500">Loading schools...</td></tr>
                                    ) : filteredSchools.length === 0 ? (
                                        <tr><td colSpan={5} className="p-4 text-center font-semibold text-gray-500">No schools found.</td></tr>
                                    ) : filteredSchools.map((school: any) => (
                                        <tr key={school.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="p-4">
                                                <p className="font-bold text-gray-900 dark:text-white">{school.name}</p>
                                                <p className="text-xs text-gray-500">{school.address || 'No address recorded'}</p>
                                            </td>
                                            <td className="p-4 font-semibold">{school.code || '-'}</td>
                                            <td className="p-4">{school.adminEmail || 'Not assigned'}</td>
                                            <td className="p-4">{school.phone || '-'}</td>
                                            <td className="p-4"><span className="px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-bold">{school.status || 'ACTIVE'}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>

            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-2xl w-full shadow-2xl border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Create School</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input type="text" required placeholder="School Name" value={formData.schoolName} onChange={(event) => setFormData({ ...formData, schoolName: event.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                    <input type="text" required placeholder="School Code" value={formData.schoolCode} onChange={(event) => setFormData({ ...formData, schoolCode: event.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                </div>
                                <input type="text" required placeholder="Address" value={formData.address} onChange={(event) => setFormData({ ...formData, address: event.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                <input type="tel" required placeholder="School Phone" value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />

                                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">School Admin Login</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input type="text" required placeholder="Admin First Name" value={formData.adminFirstName} onChange={(event) => setFormData({ ...formData, adminFirstName: event.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                        <input type="text" required placeholder="Admin Last Name" value={formData.adminLastName} onChange={(event) => setFormData({ ...formData, adminLastName: event.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        <input type="email" required placeholder="Admin Email" value={formData.adminEmail} onChange={(event) => setFormData({ ...formData, adminEmail: event.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                        <input type="password" required minLength={6} placeholder="Temporary Password" value={formData.adminPassword} onChange={(event) => setFormData({ ...formData, adminPassword: event.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                    </div>
                                </div>

                                <div className="flex space-x-4 pt-4">
                                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-3 rounded-xl font-bold transition-colors">Cancel</button>
                                    <button type="submit" disabled={isCreatingSchool} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-70">
                                        {isCreatingSchool ? 'Creating...' : 'Create School'}
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
