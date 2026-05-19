import React, { useState } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Navbar } from '../Navbar';
import { ParentDashboard } from './ParentDashboard';
import { ParentAttendance } from './ParentAttendance';
import { ParentResults } from './ParentResults';
import { ParentFees } from './ParentFees';
import { ParentNotifications } from './ParentNotifications';
import { ParentAssignments } from './ParentAssignments';

const ParentSidebar = ({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (v: boolean) => void }) => {
    const location = useLocation();
    const links = [
        { name: 'Dashboard', path: '/parent' },
        { name: 'Attendance', path: '/parent/attendance' },
        { name: 'Results', path: '/parent/results' },
        { name: 'Fees', path: '/parent/fees' },
        { name: 'Notifications', path: '/parent/notifications' },
        { name: 'Assignments', path: '/parent/assignments' }
    ];

    return (
        <aside className={`fixed top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="h-16 flex items-center justify-center border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-black text-orange-500">SMS<span className="text-gray-800 dark:text-white">Parent</span></h2>
            </div>
            <nav className="p-4 space-y-2">
                {links.map((link) => (
                    <Link key={link.name} to={link.path} onClick={() => window.innerWidth < 1024 && setIsOpen(false)} className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-colors ${location.pathname === link.path || (link.path !== '/parent' && location.pathname.startsWith(link.path)) ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                        <span>{link.name}</span>
                    </Link>
                ))}
            </nav>
        </aside>
    );
};

export const ParentPortal = () => {
    const [isOpen, setIsOpen] = useState(true);
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
            {isOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setIsOpen(false)} />}
            <ParentSidebar isOpen={isOpen} setIsOpen={setIsOpen} />
            <div className={`transition-all duration-500 ${isOpen ? 'lg:ml-64' : 'ml-0'} flex flex-col min-h-screen`}>
                <Navbar toggleSidebar={() => setIsOpen(!isOpen)} userRole="Parent" />
                <main className="flex-1 p-6 lg:p-8">
                    <Routes>
                        <Route index element={<ParentDashboard />} />
                        <Route path="attendance" element={<ParentAttendance />} />
                        <Route path="results" element={<ParentResults />} />
                        <Route path="fees" element={<ParentFees />} />
                        <Route path="notifications" element={<ParentNotifications />} />
                        <Route path="assignments" element={<ParentAssignments />} />
                        <Route path="*" element={<Navigate to="/parent" replace />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
};
