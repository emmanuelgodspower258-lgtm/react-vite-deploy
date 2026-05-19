import React from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Sidebar = ({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (v: boolean) => void }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const role = user?.role || '';

    const handleLogout = async () => {
        try {
            await logout(); // Call the logout function from your AuthContext
            navigate('/login'); // Redirect to the login page after successful logout
        } catch (error) {
            console.error("Error logging out:", error);
            // Optionally, display a toast notification for the error
        }
    };

    const allLinks = [
        { name: 'Dashboard', path: '/', roles: ['ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT'] },
        { name: 'Schools', path: '/schools', roles: ['SUPER_ADMIN'] },
        { name: 'Academics', path: '/academics', roles: ['ADMIN'] },
        { name: 'Students & Parents', path: '/students', roles: ['ADMIN'] },
        { name: 'Assignments', path: '/assignments', roles: ['TEACHER'] },
        { name: 'Attendance', path: '/attendance', roles: ['ADMIN', 'TEACHER'] },
        { name: 'Grades Input', path: '/grades', roles: ['ADMIN', 'TEACHER'] },
        { name: 'Staff Management', path: '/staff', roles: ['ADMIN'] },
        { name: 'Fee Management', path: '/finance', roles: ['ADMIN', 'PARENT'] },
        { name: 'Report Cards', path: '/reports', roles: ['ADMIN', 'TEACHER', 'PARENT'] },
        { name: 'Announcements & Chat', path: '/messages', roles: ['ADMIN', 'TEACHER', 'PARENT'] },
        { name: 'Notifications', path: '/notifications', roles: ['ADMIN', 'TEACHER'] },
        { name: 'School Settings', path: '/settings', roles: ['ADMIN'] },
    ];

    // Only show links that match the user's role
    const links = allLinks.filter(link => link.roles.includes(role));

    return (
        <motion.div
            initial={{ x: -250 }}
            animate={{ x: isOpen ? 0 : -250 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-xl z-50 transition-colors duration-500 flex flex-col border-r border-gray-100 dark:border-gray-700"
        >
            <div className="flex items-center justify-between h-20 px-6 border-b border-gray-100 dark:border-gray-700">
                <h1 className="text-2xl font-extrabold text-orange-500 tracking-tight">SMS Portal</h1>
                <button onClick={() => setIsOpen(false)} className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-orange-500 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto py-6">
                <nav className="px-4 space-y-2">
                    {links.map((link) => {
                        const isActive = location.pathname === link.path;
                        return (
                            <Link
                                key={link.name}
                                to={link.path}
                                className={`block px-4 py-3 rounded-xl transition-all duration-300 font-semibold ${isActive
                                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-gray-700 hover:text-orange-500 dark:hover:text-orange-400'
                                    }`}
                            >
                                {link.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Logout Button */}
            <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-700">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-300 font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    Logout
                </button>
            </div>
        </motion.div>
    );
};
