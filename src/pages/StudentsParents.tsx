import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useGetStudentsQuery, useCreateStudentMutation, useUpdateStudentMutation } from '../studentsApi';
import { auth, rtdb } from '../firebase';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { ref, update } from 'firebase/database';
import { useAuth } from '../context/AuthContext';
import { logActivity } from '../services/firestore';
import { useStudentSearch } from '../services/searchService';

export const StudentsParents = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [showParentModal, setShowParentModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [classFilter, setClassFilter] = useState('ALL');
    const { user: currentUser } = useAuth();

    const { data: students = [], isLoading } = useGetStudentsQuery();
    const { results: studentSearchResults, isLoading: isSearchingStudents } = useStudentSearch(searchQuery, { classId: classFilter });
    const [createStudent, { isLoading: isCreating }] = useCreateStudentMutation();
    const [updateStudent] = useUpdateStudentMutation();

    const [formData, setFormData] = useState({
        firstName: '', lastName: '', admissionNumber: '', currentClass: '',
        parentName: '', primaryPhone: '', alternatePhone: '', email: '', homeAddress: ''
    });

    const [parentFormData, setParentFormData] = useState({
        fullName: '', email: '', password: '', phoneNumber: '', studentAdmissionNumber: ''
    });
    const [isCreatingParent, setIsCreatingParent] = useState(false);

    const filteredStudents = studentSearchResults.map((result) => result.record);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createStudent({
                ...formData,
                schoolId: currentUser?.schoolId || '',
                schoolName: currentUser?.schoolName || '',
            }).unwrap();
            setShowEnrollModal(false);
            setFormData({
                firstName: '', lastName: '', admissionNumber: '', currentClass: '',
                parentName: '', primaryPhone: '', alternatePhone: '', email: '', homeAddress: ''
            });
            toast.success('Student profile saved successfully!');
        } catch (err) {
            toast.error('Failed to enroll student.');
            console.error(err);
        }
    };

    const handleCreateParent = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreatingParent(true);
        try {
            // Creates the account in Firebase Auth
            const secondaryApp = initializeApp(auth.app.options, `parent-account-${Date.now()}`);
            const secondaryAuth = getAuth(secondaryApp);
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, parentFormData.email, parentFormData.password);
            await deleteApp(secondaryApp);
            const parentUid = userCredential.user.uid;
            const schoolId = currentUser?.schoolId || '';
            const linkedStudent = students.find((student: any) => String(student.admissionNumber || '').trim() === parentFormData.studentAdmissionNumber.trim());
            const parentProfile = {
                uid: parentUid,
                name: parentFormData.fullName,
                email: parentFormData.email,
                phoneNumber: parentFormData.phoneNumber,
                role: 'PARENT',
                schoolId,
                schoolName: currentUser?.schoolName || '',
                studentAdmissionNumber: parentFormData.studentAdmissionNumber,
                studentId: linkedStudent?.id || '',
                studentClass: linkedStudent?.currentClass || linkedStudent?.classId || '',
                classId: linkedStudent?.currentClass || linkedStudent?.classId || '',
                createdAt: new Date().toISOString()
            };

            await update(ref(rtdb), {
                ...(schoolId ? { [`schools/${schoolId}/users/${parentUid}`]: parentProfile } : {}),
                ...(schoolId ? { [`userSchools/${parentUid}`]: { schoolId, role: 'PARENT' } } : {}),
            });
            if (schoolId) await logActivity('created', `schools/${schoolId}/users`, { recordId: parentUid, schoolId, message: `Created parent account for ${parentFormData.fullName}` });

            toast.success('Parent account created successfully.');
            setShowParentModal(false);
            setParentFormData({ fullName: '', email: '', password: '', phoneNumber: '', studentAdmissionNumber: '' });
        } catch (err: any) {
            toast.error(err.message || 'Failed to create parent account.');
        } finally {
            setIsCreatingParent(false);
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
                            <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white">Students & Parents</h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage enrollments, biodata, and guardian links.</p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setShowParentModal(true)} className="bg-white dark:bg-gray-800 text-orange-600 border border-orange-500 px-6 py-2.5 rounded-xl font-semibold shadow-sm transition-all hover:bg-orange-50">
                                + Create Parent Account
                            </button>
                            <button onClick={() => setShowEnrollModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md transition-all">
                                + Enroll New Student
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <motion.div whileHover={{ y: -5 }} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-gray-500 font-semibold mb-2">Total Active Students</h3>
                            <p className="text-4xl font-black text-blue-500">{isLoading ? '...' : students.length}</p>
                        </motion.div>
                        <motion.div whileHover={{ y: -5 }} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-gray-500 font-semibold mb-2">Registered Parents/Guardians</h3>
                            <p className="text-4xl font-black text-green-500">{isLoading ? '...' : students.length}</p>
                        </motion.div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Student Directory</h2>
                            <div className="flex space-x-3">
                                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search name or admission no..." maxLength={100} className="px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white w-64 focus:ring-2 focus:ring-orange-500 outline-none shadow-sm" />
                                <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none shadow-sm">
                                    <option value="ALL">All Classes</option>
                                    <optgroup label="Primary">
                                        <option value="PRI1">Primary 1</option><option value="PRI2">Primary 2</option><option value="PRI3">Primary 3</option>
                                        <option value="PRI4">Primary 4</option><option value="PRI5">Primary 5</option><option value="PRI6">Primary 6</option>
                                    </optgroup>
                                    <optgroup label="Secondary">
                                        <option value="JSS1">JSS 1</option><option value="JSS2">JSS 2</option><option value="JSS3">JSS 3</option>
                                        <option value="SS1">SS 1</option><option value="SS2">SS 2</option><option value="SS3">SS 3</option>
                                    </optgroup>
                                </select>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                                    <tr>
                                        <th className="p-4 font-semibold">Admission No</th>
                                        <th className="p-4 font-semibold">Student Name</th>
                                        <th className="p-4 font-semibold">Current Class</th>
                                        <th className="p-4 font-semibold">Primary Parent</th>
                                        <th className="p-4 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                                    {(isLoading || isSearchingStudents) ? (
                                        <tr><td colSpan={5} className="p-4 text-center font-semibold text-gray-500">Loading student directory...</td></tr>
                                    ) : filteredStudents.length === 0 ? (
                                        <tr><td colSpan={5} className="p-4 text-center font-semibold text-gray-500">No students enrolled yet.</td></tr>
                                    ) : filteredStudents.map((student: any) => (
                                        <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="p-4">{student.admissionNumber}</td>
                                            <td className="p-4 font-bold text-gray-800 dark:text-white flex items-center space-x-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">{student.firstName?.[0]}{student.lastName?.[0]}</div>
                                                <span>{student.firstName} {student.lastName}</span>
                                            </td>
                                            <td className="p-4"><span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg text-sm font-medium">{student.currentClass}</span></td>
                                            <td className="p-4">
                                                <p className="font-semibold">{student.parentName}</p>
                                                <p className="text-xs text-gray-500">{student.primaryPhone}</p>
                                            </td>
                                            <td className="p-4 text-orange-500 font-semibold cursor-pointer hover:underline" onClick={() => setSelectedStudent({ id: student.id, name: `${student.firstName} ${student.lastName}`, adm: student.admissionNumber, class: student.currentClass, parent: student.parentName })}>View Full Profile</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>

            {/* Student Profile Modal */}
            <AnimatePresence>
                {selectedStudent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white dark:bg-gray-800 rounded-3xl p-0 max-w-5xl w-full shadow-2xl border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-hidden flex flex-col md:flex-row">

                            <button onClick={() => setSelectedStudent(null)} className="absolute top-4 right-4 z-10 p-2 bg-gray-100 dark:bg-gray-700 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 rounded-full text-gray-500 dark:text-gray-400 transition-colors shadow-sm">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>

                            {/* Left Sidebar - Visual Summary */}
                            <div className="w-full md:w-1/3 bg-gray-50 dark:bg-gray-800/50 border-r border-gray-100 dark:border-gray-700 p-8 flex flex-col items-center text-center">
                                <div className="w-24 h-24 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-3xl mb-4 shadow-inner">AJ</div>
                                <h2 className="text-2xl font-black text-gray-800 dark:text-white">{selectedStudent.name}</h2>
                                <p className="text-orange-500 font-bold mb-6">{selectedStudent.adm}</p>

                                <div className="w-full space-y-4 mb-8">
                                    <div className="bg-white dark:bg-gray-700 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600">
                                        <p className="text-xs text-gray-500 font-bold uppercase">Current Class</p>
                                        <p className="text-lg font-black text-gray-800 dark:text-white">{selectedStudent.class}</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-700 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600">
                                        <p className="text-xs text-gray-500 font-bold uppercase">Attendance</p>
                                        <p className="text-lg font-black text-green-500">95%</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-700 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600">
                                        <p className="text-xs text-gray-500 font-bold uppercase">Avg. Performance</p>
                                        <p className="text-lg font-black text-blue-500">82.5%</p>
                                    </div>
                                </div>

                                <div className="w-full flex flex-col gap-3">
                                    <button onClick={() => toast.success('Redirecting to messaging...')} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-colors shadow-sm">Message Parent</button>
                                    <button onClick={() => setSelectedStudent(null)} className="w-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white py-3 rounded-xl font-bold transition-colors">Close Profile</button>
                                </div>
                            </div>

                            {/* Right Content - Detailed Information */}
                            <div className="w-full md:w-2/3 p-8 overflow-y-auto">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Detailed Information</h3>
                                    <button onClick={() => setShowEnrollModal(true)} className="text-orange-500 font-bold text-sm hover:underline">Edit Details</button>
                                </div>

                                <div className="space-y-8">
                                    <section>
                                        <h4 className="font-bold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4 uppercase text-xs tracking-wider">Guardian Information</h4>
                                        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30 p-4 rounded-xl flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-gray-800 dark:text-white">{selectedStudent.parent} <span className="ml-2 text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-md">Primary</span></p>
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">robert.j@email.com • +1 555-0199</p>
                                            </div>
                                            <button onClick={async () => {
                                                await updateStudent({ id: selectedStudent.id, parentName: '', primaryPhone: '', parentUid: '' }).unwrap();
                                                setSelectedStudent({ ...selectedStudent, parent: '' });
                                                toast.success('Guardian unlinked successfully!');
                                            }} className="text-sm font-bold text-gray-500 hover:text-red-500 transition-colors">Unlink</button>
                                        </div>
                                    </section>

                                    <section>
                                        <h4 className="font-bold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4 uppercase text-xs tracking-wider">Medical & Allergies</h4>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-4 rounded-xl"><span className="font-bold text-red-600 dark:text-red-400">Allergic to Peanuts.</span> Asthma inhaler required before sports activities.</p>
                                    </section>

                                    <section>
                                        <h4 className="font-bold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4 uppercase text-xs tracking-wider">Academic & Class History</h4>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700">
                                                <div><p className="font-bold text-gray-800 dark:text-white text-sm">2023/2024 Session</p><p className="text-xs text-gray-500">Primary 6</p></div>
                                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold tracking-wide">PROMOTED</span>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create Parent Modal */}
            <AnimatePresence>
                {showParentModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-gray-100 dark:border-gray-700">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Parent Access Setup</h3>
                            <form onSubmit={handleCreateParent} className="space-y-4">
                                <input type="text" required placeholder="Parent Full Name" value={parentFormData.fullName} onChange={(e) => setParentFormData({...parentFormData, fullName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                <input type="email" required placeholder="Email Address (Login ID)" value={parentFormData.email} onChange={(e) => setParentFormData({...parentFormData, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                <input type="password" required placeholder="Temporary Password" value={parentFormData.password} onChange={(e) => setParentFormData({...parentFormData, password: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                <input type="tel" required placeholder="Phone Number" value={parentFormData.phoneNumber} onChange={(e) => setParentFormData({...parentFormData, phoneNumber: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                <input type="text" required placeholder="Linked Student Admission No." value={parentFormData.studentAdmissionNumber} onChange={(e) => setParentFormData({...parentFormData, studentAdmissionNumber: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                
                                <div className="flex space-x-4 pt-4">
                                    <button type="button" onClick={() => setShowParentModal(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-800 dark:text-white py-3 rounded-xl font-bold transition-colors">Cancel</button>
                                    <button type="submit" disabled={isCreatingParent} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-colors shadow-md disabled:opacity-70">
                                        {isCreatingParent ? 'Creating...' : 'Create Account'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Enroll/Edit Student Modal */}
            <AnimatePresence>
                {showEnrollModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Student Profile</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" required placeholder="First Name" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} maxLength={50} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                    <input type="text" required placeholder="Last Name" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} maxLength={50} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                </div>
                                <input type="text" required placeholder="Admission Number" value={formData.admissionNumber} onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })} maxLength={20} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />

                                <input type="text" required placeholder="Assign or Type Class..." value={formData.currentClass} onChange={(e) => setFormData({ ...formData, currentClass: e.target.value })} list="class-list" maxLength={50} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                <datalist id="class-list">
                                    <option value="Primary 1" /><option value="Primary 2" /><option value="Primary 3" />
                                    <option value="Primary 4" /><option value="Primary 5" /><option value="Primary 6" />
                                    <option value="JSS 1" /><option value="JSS 2" /><option value="JSS 3" />
                                    <option value="SS 1" /><option value="SS 2" /><option value="SS 3" />
                                </datalist>

                                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">Parent / Guardian Info</h4>
                                    <div className="space-y-4">
                                        <input type="text" required placeholder="Parent/Guardian Full Name" value={formData.parentName} onChange={(e) => setFormData({ ...formData, parentName: e.target.value })} maxLength={100} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                        <div className="grid grid-cols-2 gap-4">
                                            <input type="tel" required placeholder="Primary Phone" value={formData.primaryPhone} onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })} maxLength={20} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                            <input type="tel" placeholder="Alternate Phone" value={formData.alternatePhone} onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })} maxLength={20} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                        </div>
                                        <input type="email" placeholder="Email Address" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} maxLength={100} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                        <input type="text" required placeholder="Home Address" value={formData.homeAddress} onChange={(e) => setFormData({ ...formData, homeAddress: e.target.value })} maxLength={200} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                        <input type="text" placeholder="Office/Work Address (Optional)" maxLength={200} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                    </div>
                                </div>

                                <div className="flex space-x-4 pt-4">
                                    <button type="button" onClick={() => setShowEnrollModal(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-3 rounded-xl font-bold transition-colors">Cancel</button>
                                    <button type="submit" disabled={isCreating} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-70">
                                        {isCreating ? 'Saving...' : 'Save Profile'}
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
