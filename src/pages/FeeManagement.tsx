import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useGetFeesQuery, useAddPaymentMutation } from '../feesApi';
import { useGetStudentsQuery } from '../studentsApi';
import { useAuth } from '../context/AuthContext';
import { useCollection, useCreateMutation } from '../services/firestoreHooks';
import { participantsFromUsers, resolveAudienceUsers } from '../services/audience';
import { normalizeClassName } from '../services/schoolPaths';
import { useDebouncedValue, useStudentSearch } from '../services/searchService';

export const FeeManagement = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [showCustomFeeModal, setShowCustomFeeModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedFeeSearch = useDebouncedValue(searchQuery, 300);
    const [statusFilter, setStatusFilter] = useState('ALL');

    const { data: feesList = [], isLoading } = useGetFeesQuery();
    const [addPayment, { isLoading: isRecording }] = useAddPaymentMutation();

    const [paymentData, setPaymentData] = useState({
        studentName: '', feeTitle: '', amount: '', method: 'CASH', date: ''
    });
    const { user } = useAuth();
    const { data: students = [] } = useGetStudentsQuery();
    const { results: paymentStudentResults } = useStudentSearch(paymentData.studentName);
    const { data: users = [] } = useCollection('users');
    const [createNotification, { isLoading: isSendingReminder }] = useCreateMutation('notifications');

    const filteredFees = feesList.filter((fee: any) => {
        const matchesSearch = `${fee.studentName || ''} ${fee.admissionNumber || ''} ${fee.studentAdmissionNumber || ''}`.toLowerCase().includes(debouncedFeeSearch.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || (fee.status || 'CLEARED') === statusFilter;
        return matchesSearch && matchesStatus;
    });
    const totalCollected = feesList.reduce((sum: number, fee: any) => sum + Number(fee.amountPaid || fee.amount || 0), 0);
    const outstandingBalance = feesList.reduce((sum: number, fee: any) => sum + Number(fee.balance || 0), 0);
    const unpaidAccounts = feesList.filter((fee: any) => ['UNPAID', 'PARTIAL'].includes(String(fee.status || '').toUpperCase())).length;

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const paymentLookup = paymentData.studentName.trim().toLowerCase();
            const matchedStudent = paymentStudentResults.map((result) => result.record).find((student: any) =>
                `${student.firstName || ''} ${student.lastName || ''} ${student.admissionNumber || ''}`.toLowerCase().includes(paymentLookup)
            );
            await addPayment({
                ...paymentData,
                studentName: matchedStudent ? `${matchedStudent.firstName || ''} ${matchedStudent.lastName || ''}`.trim() : paymentData.studentName,
                admissionNumber: matchedStudent?.admissionNumber || paymentData.studentName,
                studentAdmissionNumber: matchedStudent?.admissionNumber || paymentData.studentName,
                parentUid: matchedStudent?.parentUid || '',
                className: matchedStudent?.currentClass || matchedStudent?.classId || '',
                currentClass: matchedStudent?.currentClass || matchedStudent?.classId || '',
                amount: Number(paymentData.amount),
                amountPaid: Number(paymentData.amount),
                balance: 0,
                status: 'PAID'
            }).unwrap();
            setShowPaymentModal(false);
            setPaymentData({ studentName: '', feeTitle: '', amount: '', method: 'CASH', date: '' });
            toast.success('Payment recorded successfully!');
        } catch (err) {
            toast.error('Failed to record payment.');
            console.error(err);
        }
    };

    const handleSendReminder = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const audience = String(form.get('audience') || 'ALL_UNPAID');
        const message = String(form.get('message') || '');
        const reminderAudience = audience === 'ALL_UNPAID'
            ? users.filter((account: any) => feesList.some((fee: any) => ['UNPAID', 'PARTIAL'].includes(String(fee.status || '').toUpperCase()) && (fee.parentUid === account.id || fee.studentAdmissionNumber === account.studentAdmissionNumber)))
            : audience === 'INDIVIDUAL'
                ? []
                : resolveAudienceUsers(audience === 'ALL' ? 'ALL_PARENTS' : `${audience}_PARENTS`, users, students);
        await createNotification({
            type: 'BROADCAST',
            audience,
            category: 'FINANCE',
            title: 'Fee Reminder',
            content: message,
            message,
            author: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'School',
            role: user?.role || 'Admin',
            avatar: '₦',
            timestamp: new Date().toISOString(),
            participants: participantsFromUsers(reminderAudience),
            readBy: {},
            likedBy: {},
            likes: 0,
        }).unwrap();
        setShowReminderModal(false);
        toast.success('Reminders dispatched successfully!');
    };

    const handleCreateCustomFee = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const target = String(form.get('target') || 'ALL');
        const feeTitle = String(form.get('feeTitle') || '');
        const amount = Number(form.get('amount') || 0);
        const dueDate = String(form.get('dueDate') || '');
        const targetStudents = target === 'ALL'
            ? students
            : students.filter((student: any) => normalizeClassName(student.currentClass || student.classId).startsWith(normalizeClassName(target)));
        await Promise.all(targetStudents.map((student: any) => addPayment({
            studentName: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
            admissionNumber: student.admissionNumber || '',
            studentAdmissionNumber: student.admissionNumber || '',
            parentUid: student.parentUid || '',
            className: student.currentClass || student.classId || '',
            currentClass: student.currentClass || student.classId || '',
            feeTitle,
            amount,
            amountPaid: 0,
            balance: amount,
            status: 'UNPAID',
            dueDate,
            method: '',
            date: dueDate,
        }).unwrap()));
        setShowCustomFeeModal(false);
        toast.success('Custom fee applied to accounts!');
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
            {isOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setIsOpen(false)} />}
            <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

            <div className={`transition-all duration-500 ${isOpen ? 'lg:ml-64' : 'ml-0'} flex flex-col min-h-screen`}>
                <Navbar toggleSidebar={() => setIsOpen(!isOpen)} userRole="School Administrator" />

                <main className="flex-1 p-6 lg:p-8">
                    <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white mb-8">Fee Management</h1>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 rounded-2xl shadow-sm hover:-translate-y-1 hover:shadow-md transition-all">
                            <h3 className="font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase text-xs tracking-wider">Total Collected (Term 1)</h3>
                            <p className="text-3xl font-black text-emerald-500">₦{totalCollected.toLocaleString()}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 rounded-2xl shadow-sm hover:-translate-y-1 hover:shadow-md transition-all">
                            <h3 className="font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase text-xs tracking-wider">Outstanding Balances</h3>
                            <p className="text-3xl font-black text-rose-500">₦{outstandingBalance.toLocaleString()}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-white p-6 rounded-2xl shadow-sm hover:-translate-y-1 hover:shadow-md transition-all">
                            <h3 className="font-bold mb-2 text-gray-500 uppercase text-xs tracking-wider">Unpaid Accounts</h3>
                            <p className="text-3xl font-black text-rose-500">{unpaidAccounts} <span className="text-sm font-medium text-gray-400">Students</span></p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center gap-2">
                            <button onClick={() => setShowPaymentModal(true)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-xl font-bold transition-colors text-sm shadow-sm">+ Add Payment Record</button>
                            <button onClick={() => setShowCustomFeeModal(true)} className="w-full bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 py-2 rounded-xl font-bold transition-colors text-sm border border-orange-200 dark:border-orange-800/30 shadow-sm">+ Custom Ad-Hoc Fee</button>
                            <button onClick={() => setShowReminderModal(true)} className="w-full bg-rose-500 hover:bg-rose-600 text-white py-2 rounded-xl font-bold transition-colors text-sm shadow-sm">Send Bulk Reminders</button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50 dark:bg-gray-800/50">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Transaction Ledger</h2>
                            <div className="flex space-x-3 w-full md:w-auto">
                                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search student or admission no..." maxLength={100} className="flex-1 md:w-64 px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm" />
                                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm">
                                    <option value="ALL">All Status</option>
                                    <option value="PAID">Fully Paid</option>
                                    <option value="PARTIAL">Partial</option>
                                    <option value="UNPAID">Unpaid</option>
                                </select>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                                    <tr>
                                        <th className="p-4 font-semibold text-sm">Student Details</th>
                                        <th className="p-4 font-semibold text-sm">Class</th>
                                        <th className="p-4 font-semibold text-sm">Total Fees</th>
                                        <th className="p-4 font-semibold text-sm">Amount Paid</th>
                                        <th className="p-4 font-semibold text-sm">Balance</th>
                                        <th className="p-4 font-semibold text-sm">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                                    {isLoading ? (
                                        <tr><td colSpan={6} className="p-4 text-center font-semibold text-gray-500">Loading transactions...</td></tr>
                                    ) : filteredFees.length === 0 ? (
                                        <tr><td colSpan={6} className="p-4 text-center font-semibold text-gray-500">No payment records found.</td></tr>
                                    ) : filteredFees.map((fee: any) => (
                                        <tr key={fee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="p-4">
                                                <p className="font-bold text-gray-800 dark:text-white">{fee.studentName}</p>
                                                <p className="text-xs text-gray-500">{fee.feeTitle}</p>
                                            </td>
                                            <td className="p-4 font-medium">{fee.className || fee.currentClass || ''}</td>
                                            <td className="p-4 font-semibold">₦{Number(fee.amount || 0).toLocaleString()}</td>
                                            <td className="p-4 font-semibold text-emerald-600">₦{Number(fee.amountPaid || fee.amount || 0).toLocaleString()}</td>
                                            <td className="p-4"><span className="px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-bold tracking-wide uppercase">{fee.status || 'CLEARED'}</span></td>
                                            <td className="p-4 flex flex-col items-start gap-1">
                                                <button onClick={() => toast.success('Receipt generated and sent to printer!')} className="text-orange-500 font-bold text-sm hover:underline">Print Receipt</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>

            {/* Send Reminder Modal */}
            <AnimatePresence>
                {showReminderModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-700">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Fee Reminder</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Automatically dispatch SMS/Email notifications to parents regarding outstanding balances.</p>
                            <form onSubmit={handleSendReminder} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Target Audience</label>
                                    <select name="audience" required className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none">
                                        <option value="ALL">All Parents (School-wide)</option>
                                        <option value="ALL_UNPAID">All Unpaid Accounts</option>
                                        <optgroup label="Primary Classes">
                                            <option value="PRI1">Primary 1</option>
                                            <option value="PRI2">Primary 2</option>
                                            <option value="PRI3">Primary 3</option>
                                            <option value="PRI4">Primary 4</option>
                                            <option value="PRI5">Primary 5</option>
                                            <option value="PRI6">Primary 6</option>
                                        </optgroup>
                                        <optgroup label="Secondary Classes">
                                            <option value="JSS1">JSS 1</option>
                                            <option value="JSS2">JSS 2</option>
                                            <option value="JSS3">JSS 3</option>
                                            <option value="SS1">SS 1</option>
                                            <option value="SS2">SS 2</option>
                                            <option value="SS3">SS 3</option>
                                        </optgroup>
                                        <option value="INDIVIDUAL">Specific Student / Parent...</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Custom Message</label>
                                    <textarea name="message" required rows={4} maxLength={500} defaultValue="Dear Parent, this is a reminder that tuition fees for Term 1 are currently overdue. Please clear the outstanding balance to avoid interruptions to classes." className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none resize-none"></textarea>
                                </div>
                                <div className="flex space-x-4 pt-4">
                                    <button type="button" onClick={() => setShowReminderModal(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-3 rounded-xl font-bold transition-colors">Cancel</button>
                                    <button type="submit" disabled={isSendingReminder} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl font-bold transition-colors shadow-md disabled:opacity-70">{isSendingReminder ? 'Dispatching...' : 'Dispatch Reminders'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Custom Fee Modal */}
            <AnimatePresence>
                {showCustomFeeModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-700">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Create Ad-Hoc Fee</h3>
                            <form onSubmit={handleCreateCustomFee} className="space-y-4">
                                <input name="feeTitle" type="text" required placeholder="Fee Title (e.g. Science Excursion)" maxLength={100} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                <div className="flex items-center bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-orange-500 transition-all">
                                    <span className="text-gray-500 dark:text-gray-400 font-bold mr-2">₦</span>
                                    <input name="amount" type="number" required min="1" placeholder="Amount" className="w-full bg-transparent text-gray-900 dark:text-white outline-none" />
                                </div>
                                <select name="target" required defaultValue="" className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none">
                                    <option value="" disabled>Apply fee to...</option>
                                    <option value="ALL">Entire School</option>
                                    <optgroup label="Primary Classes">
                                        <option value="PRI1">Primary 1</option><option value="PRI2">Primary 2</option><option value="PRI3">Primary 3</option>
                                        <option value="PRI4">Primary 4</option><option value="PRI5">Primary 5</option><option value="PRI6">Primary 6</option>
                                    </optgroup>
                                    <optgroup label="Secondary Classes">
                                        <option value="JSS1">JSS 1</option><option value="JSS2">JSS 2</option><option value="JSS3">JSS 3</option>
                                        <option value="SS1">SS 1</option><option value="SS2">SS 2</option><option value="SS3">SS 3</option>
                                    </optgroup>
                                </select>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Payment Deadline</label>
                                    <input name="dueDate" type="date" required className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                </div>
                                <div className="flex space-x-4 pt-4">
                                    <button type="button" onClick={() => setShowCustomFeeModal(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-3 rounded-xl font-bold transition-colors">Cancel</button>
                                    <button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-colors shadow-md">Apply Fee</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Record Payment Modal */}
            <AnimatePresence>
                {showPaymentModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-700">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Record Payment / Installment</h3>
                            <form onSubmit={handleRecordPayment} className="space-y-4">
                                <input type="text" required placeholder="Search Student Name or ID..." value={paymentData.studentName} onChange={(e) => setPaymentData({...paymentData, studentName: e.target.value})} maxLength={100} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" />
                                <input type="text" required placeholder="Fee Title (e.g. Term 1 Tuition)" value={paymentData.feeTitle} onChange={(e) => setPaymentData({...paymentData, feeTitle: e.target.value})} maxLength={100} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" />

                                <div className="flex items-center bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
                                    <span className="text-gray-500 dark:text-gray-400 font-bold mr-2">₦</span>
                                    <input type="number" required min="1" max="10000000" placeholder="Amount (Full or Installment)" value={paymentData.amount} onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})} className="w-full bg-transparent text-gray-900 dark:text-white outline-none" />
                                </div>

                                <select required value={paymentData.method} onChange={(e) => setPaymentData({...paymentData, method: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none">
                                    <option value="" disabled>Payment Method...</option>
                                    <option value="CASH">Cash</option>
                                    <option value="TRANSFER">Bank Transfer</option>
                                    <option value="POS">POS / Card</option>
                                </select>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Date of Payment</label>
                                    <input type="date" required value={paymentData.date} onChange={(e) => setPaymentData({...paymentData, date: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                                <div className="flex space-x-4 pt-4">
                                    <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-3 rounded-xl font-bold transition-colors">Cancel</button>
                                    <button type="submit" disabled={isRecording} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold transition-colors shadow-md disabled:opacity-70">
                                        {isRecording ? 'Saving...' : 'Confirm Payment'}
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
