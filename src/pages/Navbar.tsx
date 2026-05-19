import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export const Navbar = ({ toggleSidebar, userRole }: { toggleSidebar: () => void, userRole: string }) => {
    const { logout } = useAuth();

    return (
        <header className="h-20 bg-white dark:bg-gray-800 shadow-sm flex items-center justify-between px-6 transition-colors duration-500 z-40 sticky top-0 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center">
                <button
                    onClick={toggleSidebar}
                    className="text-gray-600 dark:text-gray-300 focus:outline-none hover:text-orange-500 transition-colors mr-4"
                >
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white hidden sm:block">Overview</h2>
            </div>

            <div className="flex items-center space-x-4">
                <div className="px-4 py-2 bg-orange-100 dark:bg-gray-700 text-orange-600 dark:text-orange-400 rounded-full font-bold text-sm tracking-wide shadow-inner">
                    {userRole}
                </div>
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => logout()}
                    className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-5 py-2.5 rounded-xl transition-colors font-semibold shadow-sm"
                >
                    Logout
                </motion.button>
            </div>
        </header>
    );
};