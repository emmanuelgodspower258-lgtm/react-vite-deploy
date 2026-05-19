import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGetDashboardSummaryQuery } from '../../dashboardApi';

export const TeacherDashboard = () => {
    const { user } = useAuth();
    const { data: stats, isLoading, error } = useGetDashboardSummaryQuery();

    const name = user?.firstName || user?.email || 'Teacher';

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white">Welcome back, {name}!</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">This is your teacher dashboard with live school data.</p>
                </div>
                <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold">Your role</p>
                    <p className="text-lg font-black text-orange-600 dark:text-orange-400">Teacher</p>
                </div>
            </div>

            {!!error && (
                <div className="rounded-3xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-200">
                    Unable to load your teacher dashboard.
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {[
                    { label: 'Active Classes', value: stats?.activeClasses || 0, accent: 'text-orange-500', helper: 'Your current classes' },
                    { label: 'Pending Grading', value: stats?.pendingAssignments || 0, accent: 'text-amber-500', helper: 'Assignments waiting review' },
                    { label: 'Unread Messages', value: stats?.unreadMessages || 0, accent: 'text-rose-500', helper: 'Parent messages' },
                    { label: 'Attendance Rate', value: stats?.attendancePercentage ? `${stats.attendancePercentage}%` : 'N/A', accent: 'text-emerald-500', helper: 'Average attendance' },
                ].map((card) => (
                    <div key={card.label} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 hover:-translate-y-1 transition-transform duration-300">
                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{card.label}</p>
                        <p className={`text-4xl font-black mt-4 ${card.accent}`}>{isLoading ? '...' : card.value}</p>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{card.helper}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Upcoming Lessons</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">A quick view of your next classes.</p>
                        </div>
                        <button className="text-orange-600 dark:text-orange-400 text-sm font-semibold hover:underline">View schedule</button>
                    </div>
                    <div className="space-y-4">
                        {(stats?.upcomingLessons || []).length > 0 ? (
                            stats.upcomingLessons.map((lesson: any) => (
                                <div key={lesson.id || lesson.time} className="p-4 rounded-3xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30">
                                    <p className="text-sm text-orange-600 font-semibold">{lesson.time}</p>
                                    <p className="font-bold text-gray-800 dark:text-white mt-1">{lesson.subject}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{lesson.className}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming lessons are available yet.</p>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Recent Announcements</h2>
                    <div className="space-y-4">
                        {(stats?.announcements || []).length > 0 ? (
                            stats.announcements.map((note: any) => (
                                <div key={note.id || note.title} className="p-4 rounded-3xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700">
                                    <p className="font-semibold text-gray-800 dark:text-white">{note.title}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{note.message}</p>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 rounded-3xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700">
                                <p className="text-sm text-gray-500 dark:text-gray-400">No new announcements available right now.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};