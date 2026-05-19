import React, { useState } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Navbar } from '../Navbar';
import { TeacherDashboard } from './TeacherDashboard';
import { TeacherClasses } from './TeacherClasses';
import { TeacherAssignments } from './TeacherAssignments';
import { TeacherResults } from './TeacherResults';
import { TeacherStudents } from './TeacherStudents';
import { TeacherNotifications } from './TeacherNotifications';

const TeacherSidebar = ({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (v: boolean) => void }) => {
    const location = useLocation();
    const links = [
        { name: 'Dashboard', path: '/teacher' },
        { name: 'My Classes', path: '/teacher/classes' },
        { name: 'Assignments', path: '/teacher/assignments' },
        { name: 'Results', path: '/teacher/results' },
        { name: 'Students', path: '/teacher/students' },
        { name: 'Notifications', path: '/teacher/notifications' },
    ];

    return (
        <aside className={`fixed top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="h-16 flex items-center justify-center border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-black text-orange-500">SMS<span className="text-gray-800 dark:text-white">Staff</span></h2>
            </div>
            <nav className="p-4 space-y-2">
                {links.map((link) => (
                    <Link key={link.name} to={link.path} onClick={() => window.innerWidth < 1024 && setIsOpen(false)} className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-colors ${location.pathname === link.path || (link.path !== '/teacher' && location.pathname.startsWith(link.path)) ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                        <span>{link.name}</span>
                    </Link>
                ))}
            </nav>
        </aside>
    );
};

export const TeacherPortal = () => {
    const [isOpen, setIsOpen] = useState(true);
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
            {isOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setIsOpen(false)} />}
            <TeacherSidebar isOpen={isOpen} setIsOpen={setIsOpen} />
            <div className={`transition-all duration-500 ${isOpen ? 'lg:ml-64' : 'ml-0'} flex flex-col min-h-screen`}>
                <Navbar toggleSidebar={() => setIsOpen(!isOpen)} userRole="Teacher" />
                <main className="flex-1 p-6 lg:p-8">
                    <Routes>
                        <Route index element={<TeacherDashboard />} />
                        <Route path="classes" element={<TeacherClasses />} />
                        <Route path="assignments" element={<TeacherAssignments />} />
                        <Route path="results" element={<TeacherResults />} />
                        <Route path="students" element={<TeacherStudents />} />
                        <Route path="notifications" element={<TeacherNotifications />} />
                        <Route path="*" element={<Navigate to="/teacher" replace />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
};
