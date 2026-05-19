import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export const Users = () => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="min-h-screen bg-orange-50 dark:bg-gray-900 transition-colors duration-500">
            {isOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsOpen(false)} />
            )}
            <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
            <div className={`transition-all duration-500 ${isOpen ? 'lg:ml-64' : 'ml-0'} flex flex-col min-h-screen`}>
                <Navbar toggleSidebar={() => setIsOpen(!isOpen)} userRole="Loading..." />
                <main className="flex-1 p-6 lg:p-8">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700">
                        <h2 className="text-3xl font-extrabold text-gray-800 dark:text-white mb-4 tracking-tight">
                            User Management
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 text-lg mb-8">This module is currently under construction.</p>
                    </div>
                </main>
            </div>
        </div>
    );
};