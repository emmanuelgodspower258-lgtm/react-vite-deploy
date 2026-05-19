import React, { useState, useEffect, ReactElement } from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useNavigate, Link } from 'react-router-dom';
import { useGetDashboardSummaryQuery } from '../dashboardApi';
import { useAuth } from '../context/AuthContext';
import { useGlobalSearch } from '../services/searchService';

export const Dashboard = (): ReactElement => {
    const { user, isLoading: isAuthLoading } = useAuth();
    const [isOpen, setIsOpen] = useState(true);
    const [userRole, setUserRole] = useState<string>('Loading...');
    const [rawRole, setRawRole] = useState<string>(user?.role || '');
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    const { data: stats, isLoading } = useGetDashboardSummaryQuery();
    const { results: quickSearchResults } = useGlobalSearch(searchQuery);

    useEffect(() => {
        if (!user?.role) return;
        
        const role = String(user.role).toUpperCase();
        setRawRole(role);

        let readableRole: string = role;
        if (role === 'SUPER_ADMIN') readableRole = 'Super Admin';
        if (role === 'ADMIN') readableRole = 'School Administrator';
        if (role === 'TEACHER') readableRole = 'Teacher';
        if (role === 'PARENT') readableRole = 'Parent';

        const formattedRole = readableRole.replace(/_/g, ' ').replace(/\w\S*/g, (txt: string) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
        setUserRole(formattedRole);
    }, [user]);

    // Auto close sidebar on mobile devices
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) setIsOpen(false);
            else setIsOpen(true);
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ⚠️ CRITICAL FIX: Prevent white screen while Auth is loading
    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-6"></div>
                    <p className="text-gray-600 dark:text-gray-300 font-black text-xl animate-pulse tracking-tight">
                        Initializing SMS Portal...
                    </p>
                </motion.div>
            </div>
        );
    }

    // Dynamically generate stats based on the user's actual role
    const getDashboardStats = () => {
        if (rawRole === 'TEACHER') {
            return [
                { title: 'My Active Classes', value: stats?.activeClasses || 0, color: 'text-orange-600 dark:text-orange-400' },
                { title: 'Pending Assignments to Grade', value: stats?.pendingAssignments || 0, color: 'text-amber-600 dark:text-amber-400' },
                { title: 'Unread Parent Messages', value: stats?.unreadMessages || 0, color: 'text-rose-600 dark:text-rose-400' }
            ];
        }
        if (rawRole === 'PARENT') {
            return [
                { title: 'My Enrolled Children', value: stats?.enrolledChildren || 0, color: 'text-orange-600 dark:text-orange-400' },
                { title: 'Upcoming Exams', value: stats?.upcomingExams || 0, color: 'text-slate-700 dark:text-slate-300' },
                { title: 'Outstanding Fees', value: `₦${stats?.outstandingFees || '0.00'}`, color: 'text-emerald-600 dark:text-emerald-400' }
            ];
        }
        // Default to Admin stats
        return [
            { title: 'Total Students', value: stats?.totalStudents || 0, color: 'text-orange-600 dark:text-orange-400' },
            { title: 'Active Classes', value: stats?.totalClasses || 0, color: 'text-slate-800 dark:text-white' },
            { title: 'New Messages', value: stats?.unreadMessages || 0, color: 'text-slate-800 dark:text-white' }
        ];
    };

    const isSuperAdmin = rawRole === 'SUPER_ADMIN';
    const isAdmin = rawRole !== 'TEACHER' && rawRole !== 'PARENT';

    // Helper to ensure we are working with arrays (Firebase often returns objects for lists)
    const ensureArray = (data: any) => Array.isArray(data) ? data : (data && typeof data === 'object' ? Object.values(data) : []);

    // Defensive normalization and filtering
    const filteredActivities = ensureArray(stats?.recentActivities).filter((activity: any) => 
        String(activity.message || activity.action || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredAlerts = ensureArray(stats?.alerts).filter((alert: any) => 
        String(alert.message || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900 transition-colors duration-500 font-sans">
            {/* Dark overlay for mobile when sidebar is open */}
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <Sidebar isOpen={isOpen} setIsOpen={(val: boolean) => setIsOpen(val)} />

            <div className={`transition-all duration-500 ${isOpen ? 'lg:ml-64' : 'ml-0'} flex flex-col min-h-screen`}>
                <Navbar toggleSidebar={() => setIsOpen(!isOpen)} userRole={userRole} />

                <main className="flex-1 p-6 lg:p-8 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">
                                Dashboard Overview
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 text-lg mt-1">
                                You are logged in as a <span className="font-bold text-orange-600 dark:text-orange-400">{userRole}</span>.
                            </p>
                        </div>
                        {isAdmin && (
                            <div className="relative w-full md:w-80">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Quick search students, staff..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm transition-all"
                                />
                                <svg className="w-5 h-5 absolute left-3 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                {searchQuery.trim() && (
                                    <div className="absolute right-0 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-30 overflow-hidden">
                                        {[
                                            ['Students', quickSearchResults.students],
                                            ['Staff', quickSearchResults.staff],
                                            ['Users', quickSearchResults.users],
                                            ['Classes', quickSearchResults.classes],
                                        ].map(([label, results]: any) => (
                                            <div key={label} className="p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                                                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">{label}</p>
                                                {results.length === 0 ? <p className="text-xs text-gray-400">No matches</p> : results.slice(0, 4).map((result: any) => (
                                                    <div key={`${result.type}-${result.id}`} className="py-1.5">
                                                        <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{result.name}</p>
                                                        <p className="text-xs text-gray-500 truncate">{result.meta}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {isAdmin ? (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">

                            {/* Quick Actions */}
                            <div className="flex flex-wrap gap-3">
                                {isSuperAdmin ? (
                                    <button onClick={() => navigate('/schools')} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-700 dark:hover:text-orange-300 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-medium shadow-sm transition-all text-sm flex items-center"><span className="mr-2 text-orange-500 font-bold">+</span> Add School</button>
                                ) : (
                                    <>
                                        <button onClick={() => navigate('/students')} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-700 dark:hover:text-orange-300 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-medium shadow-sm transition-all text-sm flex items-center"><span className="mr-2 text-orange-500 font-bold">+</span> Add Student</button>
                                        <button onClick={() => navigate('/staff')} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-700 dark:hover:text-orange-300 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-medium shadow-sm transition-all text-sm flex items-center"><span className="mr-2 text-orange-500 font-bold">+</span> Add Staff</button>
                                        <button onClick={() => navigate('/academics', { state: { activeTab: 'Classes' } })} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-700 dark:hover:text-orange-300 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-medium shadow-sm transition-all text-sm flex items-center"><span className="mr-2 text-orange-500 font-bold">+</span> Create Class</button>
                                        <button onClick={() => navigate('/academics', { state: { activeTab: 'Subjects' } })} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-700 dark:hover:text-orange-300 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-medium shadow-sm transition-all text-sm flex items-center"><span className="mr-2 text-orange-500 font-bold">+</span> Create Subject</button>
                                        <button onClick={() => navigate('/finance')} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-300 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-medium shadow-sm transition-all text-sm flex items-center"><span className="mr-2 text-emerald-500 font-bold">$</span> Record Fee</button>
                                    </>
                                )}
                            </div>

                            {/* Top Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-default">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Students</p>
                                    <p className="text-2xl font-black text-gray-800 dark:text-white mt-1">{isLoading ? '...' : String(stats?.totalStudents || 0)}</p>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-default">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Staff</p>
                                    <p className="text-2xl font-black text-gray-800 dark:text-white mt-1">{isLoading ? '...' : String(stats?.totalStaff || 0)}</p>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-default">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Classes</p>
                                    <p className="text-2xl font-black text-gray-800 dark:text-white mt-1">{isLoading ? '...' : String(stats?.totalClasses || 0)}</p>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-default">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Subjects</p>
                                    <p className="text-2xl font-black text-gray-800 dark:text-white mt-1">{isLoading ? '...' : String(stats?.totalSubjects || 0)}</p>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-default">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Academic Term</p>
                                    <p className="text-sm font-black text-gray-800 dark:text-white mt-1 pt-1 leading-tight">{isLoading ? '...' : String(stats?.currentSession || 'Not Set')}<br />{String(stats?.currentTerm || '')}</p>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-default">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Attendance</p>
                                    <div className="flex items-end space-x-1 mt-1 pt-1">
                                        <span className="text-lg font-black text-green-500 leading-none">{isLoading ? '...' : `${String(stats?.attendancePercentage || 0)}%`}</span>
                                        <span className="text-xs text-gray-400 font-semibold mb-0.5">Present</span>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-default">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Fees</p>
                                    <div className="flex flex-col mt-1">
                                        <span className="text-sm font-black text-emerald-500 leading-none mb-1">{String(stats?.fees?.paidPercentage || 0)}% Paid</span>
                                        <span className="text-xs text-red-500 font-bold">₦{String(stats?.fees?.outstandingAmount || '0')} Due</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Left Column (Wider) */}
                                <div className="lg:col-span-2 space-y-6">

                                    {/* Performance Chart Mock */}
                                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-300">
                                        <h3 className="font-bold text-gray-800 dark:text-white mb-4">Academic Performance (Avg by Class)</h3>
                                        <div className="flex items-end justify-between space-x-4 h-40 mt-4">
                                            {ensureArray(stats?.academicPerformance).map((perf: any, i: number) => (
                                                <div key={i} className="bg-blue-100 dark:bg-blue-900/30 w-full rounded-t-md relative group flex flex-col justify-end h-full">
                                                    <div className="w-full bg-blue-500 rounded-t-md transition-all duration-1000" style={{ height: `${perf.average}%` }}></div>
                                                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-xs font-bold text-blue-600 dark:text-blue-400 transition-opacity">{perf.average}%</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500 mt-3 font-bold px-1">
                                            {ensureArray(stats?.academicPerformance).map((perf: any, i: number) => (
                                                <span key={i}>{String(perf.class)}</span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Alerts Panel */}
                                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-300">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center"><span className="text-red-500 mr-2 text-xl">⚠️</span> Attention Required</h3>
                                            <Link to="/messages" className="text-sm font-semibold text-orange-600 dark:text-orange-400 hover:underline">View All Alerts &rarr;</Link>
                                        </div>
                                        <ul className="space-y-4">
                                            {filteredAlerts.map((alert: any) => (
                                                <li key={alert.id} className={`flex items-start text-sm p-3 rounded-xl border ${alert.type === 'danger' ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' : alert.type === 'warning' ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/30' : 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900/30'}`}>
                                                    <span className={`w-2 h-2 mt-1.5 rounded-full mr-3 shrink-0 ${alert.type === 'danger' ? 'bg-red-500' : alert.type === 'warning' ? 'bg-orange-500' : 'bg-yellow-500'}`}></span>
                                                    <span className="text-gray-700 dark:text-gray-300 font-medium">{String(alert.message)}</span>
                                                </li>
                                            ))}
                                            {filteredAlerts.length === 0 && <p className="text-sm text-gray-500">No matching alerts.</p>}
                                        </ul>
                                    </div>

                                    {/* Recent Activity */}
                                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-300">
                                        <h3 className="font-bold text-gray-800 dark:text-white mb-4">Recent Activity</h3>
                                        <div className="space-y-4">
                                            {filteredActivities.map((activity: any) => (
                                                <div key={activity.id} className="flex items-center text-sm">
                                                    <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-lg text-slate-600 dark:text-slate-300 mr-4">{String(activity.icon || '📝')}</div>
                                                    <div><p className="text-gray-700 dark:text-gray-300 font-medium">{String(activity.message || activity.action)}</p><p className="text-xs text-gray-400 mt-0.5">{String(activity.time)}</p></div>
                                                </div>
                                            ))}
                                            {filteredActivities.length === 0 && <p className="text-sm text-gray-500">No matching activity.</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column (Narrower) */}
                                <div className="space-y-6">

                                    {/* School Summary */}
                                    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 rounded-2xl shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                                        <h3 className="font-bold mb-5 tracking-wide text-sm uppercase text-gray-500 dark:text-gray-400">School Community</h3>
                                        <div className="space-y-5">
                                            <div>
                                                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Registered Parents</p>
                                                <p className="text-3xl font-black mt-1 text-gray-800 dark:text-white">{isLoading ? '...' : String(stats?.totalParents || 0)}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Assigned Form Masters</p>
                                                <p className="text-3xl font-black mt-1 text-gray-800 dark:text-white">{isLoading ? '...' : String(stats?.totalFormMasters || 0)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Calendar Widget */}
                                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-300">
                                        <h3 className="font-bold text-gray-800 dark:text-white mb-4">Upcoming Events</h3>
                                        <ul className="space-y-4">
                                            {ensureArray(stats?.upcomingEvents).map((event: any) => (
                                                <li key={event.id} className="flex items-center">
                                                    <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold px-3 py-1.5 rounded-lg text-xs mr-3 text-center leading-none"><span className="block text-[10px] opacity-70">{String(event.month)}</span>{String(event.day)}</div>
                                                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{String(event.title)}</span>
                                                </li>
                                            ))}
                                            {(!stats?.upcomingEvents || stats.upcomingEvents.length === 0) && <p className="text-sm text-gray-500">No upcoming events.</p>}
                                        </ul>
                                    </div>

                                    {/* Communication Snapshot */}
                                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-300">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold text-gray-800 dark:text-white">Communications</h3>
                                            <span className={`${(stats?.communications?.unreadCount || 0) > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'} text-xs font-extrabold px-2.5 py-1 rounded-full`}>{String(stats?.communications?.unreadCount || 0)} Unread</span>
                                        </div>
                                        <div className="mb-5 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-2 tracking-wider">Latest Announcement</p>
                                            <p className="text-sm text-gray-800 dark:text-gray-200 font-medium leading-relaxed">{String(stats?.communications?.latestAnnouncement || 'No recent announcements.')}</p>
                                        </div>
                                        <button onClick={() => navigate('/messages')} className="w-full bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 dark:hover:bg-orange-500/20 border border-orange-100 dark:border-orange-500/30 text-orange-700 dark:text-orange-400 font-bold py-2.5 rounded-xl transition-colors text-sm">
                                            + Send Announcement
                                        </button>
                                    </div>

                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700">
                            <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white mb-6">Overview</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {getDashboardStats().map((stat, index) => (
                                    <motion.div key={index} whileHover={{ y: -5 }} className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-600 shadow-sm">
                                        <h3 className="text-gray-500 dark:text-gray-400 font-semibold mb-2">{stat.title}</h3>
                                        <p className={`text-4xl font-black ${stat.color}`}>{stat.value}</p>
                                    </motion.div>
                                ))}
                            </div>

                            {rawRole === 'PARENT' && (
                                <div className="mt-12 pt-10 border-t border-gray-100 dark:border-gray-700">
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">My Children</h3>
                                    <div className="bg-orange-50 dark:bg-orange-900/10 p-8 rounded-2xl border border-orange-100 dark:border-orange-800/30 text-center">
                                        <p className="text-orange-700 dark:text-orange-400 font-medium italic">No children linked to this account yet. Please contact the school office to connect your children's profiles.</p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </main>
            </div>
        </div>
    );
};
