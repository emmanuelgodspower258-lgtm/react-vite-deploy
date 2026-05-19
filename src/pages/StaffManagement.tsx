import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useGetStaffQuery, useCreateStaffMutation } from '../staffApi';
import { useCollection } from '../services/firestoreHooks';
import { auth, rtdb } from '../services/firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { ref, update } from 'firebase/database';
import { useAuth } from '../context/AuthContext';
import { logActivity } from '../services/firestore';
import { useStaffSearch } from '../services/searchService';

export const StaffManagement = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('Staff Directory');
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('All Roles');
    const { user } = useAuth();

    const [showStaffModal, setShowStaffModal] = useState(false);
    const tabs = ['Staff Directory', 'Roles', 'Activity Logs'];

    const { data: staffList = [], isLoading } = useGetStaffQuery();
    const { results: staffSearchResults, isLoading: isSearchingStaff } = useStaffSearch(searchQuery, { roles: roleFilter === 'All Roles' ? [] : [roleFilter] });
    const { data: activityLogs = [] } = useCollection('activityLogs');
    const [createStaff, { isLoading: isCreating }] = useCreateStaffMutation();

    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', password: '', phone: '', role: 'TEACHER', assignedClasses: '', assignedSubjects: ''
    });

    const filteredStaff = staffSearchResults.map((result) => result.record);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const secondaryApp = initializeApp(auth.app.options, `staff-account-${Date.now()}`);
            const secondaryAuth = getAuth(secondaryApp);
            const credential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
            await deleteApp(secondaryApp);

            const assignedClasses = formData.assignedClasses.split(',').map(item => item.trim()).filter(Boolean);
            const assignedSubjects = formData.assignedSubjects.split(',').map(item => item.trim()).filter(Boolean);
            const uid = credential.user.uid;
            const staffRecord = {
                ...formData,
                uid,
                role: formData.role.toUpperCase(),
                assignedClass: assignedClasses[0] || '',
                classId: assignedClasses[0] || '',
                assignedClasses,
                assignedSubjects,
                schoolId: user?.schoolId || '',
                schoolName: user?.schoolName || '',
                employeeId: `EMP-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
            };
            const { password, ...safeStaffRecord } = staffRecord;

            const staffProfile = {
                uid,
                email: formData.email,
                firstName: formData.firstName,
                lastName: formData.lastName,
                role: formData.role.toUpperCase(),
                schoolId: user?.schoolId || '',
                schoolName: user?.schoolName || '',
                assignedClass: assignedClasses[0] || '',
                classId: assignedClasses[0] || '',
                assignedClasses,
                assignedSubjects,
                createdAt: new Date().toISOString(),
            };

            await update(ref(rtdb), {
                ...(user?.schoolId ? { [`schools/${user.schoolId}/users/${uid}`]: staffProfile } : {}),
                ...(user?.schoolId ? { [`userSchools/${uid}`]: { schoolId: user.schoolId, role: staffProfile.role } } : {}),
            });
            if (user?.schoolId) await logActivity('created', `schools/${user.schoolId}/users`, { recordId: uid, schoolId: user.schoolId, message: `Created login for ${formData.firstName} ${formData.lastName}` });
            await createStaff(safeStaffRecord).unwrap();
            setShowStaffModal(false);
            setFormData({ firstName: '', lastName: '', email: '', password: '', phone: '', role: 'TEACHER', assignedClasses: '', assignedSubjects: '' });
            toast.success('Staff login account created successfully!');
        } catch (err) {
            toast.error('Failed to create staff account.');
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
                            <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white">Staff Management</h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage personnel, edit roles, and view activity logs.</p>
                        </div>
                    </div>

                    {/* Module Navigation Tabs */}
                    <div className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                        {tabs.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-3 px-4 font-semibold whitespace-nowrap transition-colors ${activeTab === tab ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} key={activeTab}>

                        {activeTab === 'Staff Directory' && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                                    <div className="flex space-x-3 w-1/2">
                                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search staff name or ID..." maxLength={100} className="flex-1 px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none shadow-sm" />
                                        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none shadow-sm">
                                            <option>All Roles</option>
                                            <option>ADMIN</option>
                                            <option>PRINCIPAL</option>
                                            <option>TEACHER</option>
                                            <option>ACCOUNTANT</option>
                                        </select>
                                    </div>
                                    <button onClick={() => setShowStaffModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-all flex items-center">
                                        <span className="mr-2">+</span> Add Staff Profile
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                                            <tr>
                                                <th className="p-4 font-semibold text-sm">Staff Profile</th>
                                                <th className="p-4 font-semibold text-sm">System Role</th>
                                                <th className="p-4 font-semibold text-sm">Contact Info</th>
                                                <th className="p-4 font-semibold text-sm">Academic Links</th>
                                                <th className="p-4 font-semibold text-sm">Status</th>
                                                <th className="p-4 font-semibold text-sm">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                                        {(isLoading || isSearchingStaff) ? (
                                            <tr><td colSpan={6} className="p-4 text-center font-semibold text-gray-500">Loading staff directory...</td></tr>
                                        ) : filteredStaff.length === 0 ? (
                                            <tr><td colSpan={6} className="p-4 text-center font-semibold text-gray-500">No staff members found.</td></tr>
                                        ) : filteredStaff.map((staff: any) => (
                                            <tr key={staff.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="p-4 flex items-center">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mr-3 uppercase">
                                                        {staff.firstName?.[0]}{staff.lastName?.[0]}
                                                    </div>
                                                    <div><p className="font-bold text-gray-800 dark:text-white">{staff.firstName} {staff.lastName}</p><p className="text-xs text-gray-500">{staff.employeeId}</p></div>
                                                </td>
                                                <td className="p-4"><span className="px-3 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-full text-xs font-bold tracking-wide uppercase">{staff.role}</span></td>
                                                <td className="p-4"><p className="text-sm">{staff.email}</p><p className="text-xs text-gray-500 mt-0.5">{staff.phone}</p></td>
                                                <td className="p-4 text-sm text-gray-500">{staff.role === 'Teacher' ? 'Subject Teacher' : <span className="italic text-gray-400">No Academic Links</span>}</td>
                                                <td className="p-4"><div className="flex items-center"><div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div><span className="text-sm font-medium">Active</span></div></td>
                                                <td className="p-4 text-orange-500 font-semibold cursor-pointer text-sm hover:underline" onClick={() => setShowStaffModal(true)}>Edit Profile</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Roles' && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 max-w-4xl">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6">System Roles</h3>
                                <div className="space-y-6">
                                    {Array.from(new Set(filteredStaff.map((staff: any) => staff.role || 'Staff'))).map((role: any) => {
                                        const assigned = filteredStaff.filter((staff: any) => (staff.role || 'Staff') === role).map((staff: any) => `${staff.firstName || ''} ${staff.lastName || ''}`.trim()).filter(Boolean).join(', ');
                                        return (
                                        <div key={role} className="p-5 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col md:flex-row md:justify-between md:items-center hover:border-orange-300 dark:hover:border-orange-600 transition-colors gap-4">
                                            <div>
                                                <h4 className="font-bold text-gray-800 dark:text-white text-lg">{role}</h4>
                                                <p className="text-sm text-gray-500 mt-1">Assigned Personnel:</p>
                                            </div>
                                            <div className="bg-orange-50 dark:bg-gray-700/50 px-4 py-2 rounded-lg border border-orange-100 dark:border-gray-600">
                                                <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">{assigned || 'No staff assigned'}</p>
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            </div>
                        )}

                        {activeTab === 'Activity Logs' && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Staff Audit Trail</h3>
                                <div className="space-y-4">
                                    {activityLogs.length === 0 ? <p className="text-sm text-gray-500">No activity has been recorded yet.</p> : activityLogs.map((log: any) => (
                                        <div key={log.id} className="flex items-center text-sm p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-4 shrink-0"></div>
                                            <p className="text-gray-600 dark:text-gray-300 flex-1"><span className="font-bold text-gray-800 dark:text-white">{log.actorEmail || 'System'}</span> {log.message || log.action}</p>
                                            <span className="text-gray-400 font-medium">{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </motion.div>
                </main>
            </div>

            {/* Staff Profile Modal */}
            <AnimatePresence>
                {showStaffModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Staff Profile</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                <input type="text" required placeholder="First Name" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} maxLength={50} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                <input type="text" required placeholder="Last Name" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} maxLength={50} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                </div>
                            <input type="email" required placeholder="Email Address" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} maxLength={100} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                            <input type="password" required placeholder="Temporary Password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} minLength={6} maxLength={100} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                            <input type="tel" required placeholder="Phone Number" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} maxLength={20} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />

                            <input type="text" required placeholder="Assign or Type Custom Role..." value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} list="role-options" maxLength={50} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                <datalist id="role-options">
                                    <option value="ADMIN" />
                                    <option value="TEACHER" />
                                    <option value="ACCOUNTANT" />
                                </datalist>
                            <input type="text" placeholder="Assigned Classes (e.g. JSS 1A, JSS 2B)" value={formData.assignedClasses} onChange={(e) => setFormData({...formData, assignedClasses: e.target.value})} maxLength={200} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                            <input type="text" placeholder="Assigned Subjects (e.g. Mathematics, Physics)" value={formData.assignedSubjects} onChange={(e) => setFormData({...formData, assignedSubjects: e.target.value})} maxLength={200} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />

                                <div className="flex space-x-4 pt-4">
                                    <button type="button" onClick={() => setShowStaffModal(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-3 rounded-xl font-bold transition-colors">Cancel</button>
                                <button type="submit" disabled={isCreating} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-70">
                                    {isCreating ? 'Saving...' : 'Create Login'}
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
