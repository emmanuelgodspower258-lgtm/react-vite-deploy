import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useGetDashboardSummaryQuery } from '../../dashboardApi';

export const ParentDashboard = () => {
    const { user } = useAuth();
    const { data: stats, isLoading, error } = useGetDashboardSummaryQuery();

    const name = user?.firstName || 'Parent';

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white">Welcome, {name}!</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Here is the latest overview for your enrolled children.</p>
                </div>
            </div>

            {!!error && (
                <div className="rounded-3xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-200">
                    Unable to load parent dashboard.
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 hover:-translate-y-1 transition-transform duration-300">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Enrolled Children</p>
                    <p className="text-4xl font-black mt-4 text-orange-500">{isLoading ? '...' : (stats?.enrolledChildren || 1)}</p>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Active students</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 hover:-translate-y-1 transition-transform duration-300">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Outstanding Fees</p>
                    <p className="text-4xl font-black mt-4 text-rose-500">₦{isLoading ? '...' : (stats?.outstandingFees || '0')}</p>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Next payment due soon</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 hover:-translate-y-1 transition-transform duration-300">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">New Messages</p>
                    <p className="text-4xl font-black mt-4 text-blue-500">{isLoading ? '...' : (stats?.unreadMessages || 0)}</p>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">From teachers & admin</p>
                </div>
            </div>
        </motion.div>
    );
};