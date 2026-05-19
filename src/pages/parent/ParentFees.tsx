import React from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useGetFeesQuery } from '../../feesApi';

export const ParentFees = () => {
    const { user } = useAuth();
    const { data: fees = [] } = useGetFeesQuery();
    const myFees = fees.filter((fee: any) => fee.parentUid === user?.id || fee.studentAdmissionNumber === user?.studentAdmissionNumber);
    const totalBilled = myFees.reduce((sum: number, fee: any) => sum + Number(fee.amount || 0), 0);
    const amountPaid = myFees.reduce((sum: number, fee: any) => sum + Number(fee.amountPaid || fee.amount || 0), 0);
    const outstanding = myFees.reduce((sum: number, fee: any) => sum + Number(fee.balance || 0), 0);
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white mb-6">Fee Management</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-2xl shadow-md text-white">
                    <h3 className="text-sm font-bold text-orange-100 uppercase tracking-wider mb-2">Total Outstanding</h3>
                    <p className="text-4xl font-black">₦{outstanding.toLocaleString()}</p>
                    <button onClick={() => toast.success('Redirecting to secure payment gateway...')} className="mt-4 w-full bg-white text-orange-600 font-bold py-2 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">Pay Now</button>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Total Billed (Term 1)</h3>
                    <p className="text-4xl font-black text-gray-800 dark:text-white">₦{totalBilled.toLocaleString()}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Amount Paid</h3>
                    <p className="text-4xl font-black text-green-500">₦{amountPaid.toLocaleString()}</p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mt-8">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700"><h2 className="text-lg font-bold text-gray-800 dark:text-white">Payment History & Breakdown</h2></div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm">
                            <tr><th className="p-4 font-semibold">Description</th><th className="p-4 font-semibold">Date</th><th className="p-4 font-semibold">Amount</th><th className="p-4 font-semibold">Status</th><th className="p-4 font-semibold">Receipt</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                            {myFees.length === 0 ? <tr><td colSpan={5} className="p-4 text-center text-gray-500 font-semibold">No fee records found.</td></tr> : myFees.map((fee: any) => (
                                <tr key={fee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="p-4 font-bold text-gray-900 dark:text-white">{fee.feeTitle}</td>
                                    <td className="p-4">{fee.date}</td><td className="p-4 font-bold text-gray-900 dark:text-white">₦{Number(fee.amount || 0).toLocaleString()}</td>
                                    <td className="p-4"><span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">{fee.status || 'PAID'}</span></td>
                                    <td className="p-4"><button className="text-orange-500 font-bold text-sm hover:underline">Download</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
};
