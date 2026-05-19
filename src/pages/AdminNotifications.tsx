import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useLiveNotifications, type LiveNotification as Notification } from '../services/useNotifications';

type Reply = { id: string; author: string; avatar: string; text: string; timestamp: string; };

export const AdminNotifications = () => {
    const [isOpen, setIsOpen] = useState(true);
    const { feed, markAsRead: markNotificationRead, toggleLike: toggleNotificationLike, reply } = useLiveNotifications();
    const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
    const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

    const toggleLike = (id: string) => {
        const notification = feed.find(n => n.id === id);
        if (!notification) return;
        toggleNotificationLike(notification);
    };

    const markAsRead = (id: string) => {
        markNotificationRead(id);
        toast.success('Marked as read');
    };

    const submitReply = async (id: string) => {
        if (!replyText[id]?.trim()) return;
        await reply(id, replyText[id], 'SA');
        setReplyText({ ...replyText, [id]: '' });
        toast.success('Reply posted!');
    };

    const displayedFeed = filter === 'ALL' ? feed : feed.filter(n => !n.isRead);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsOpen(false)} />
                )}
            </AnimatePresence>
            
            <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

            <div className={`transition-all duration-500 ${isOpen ? 'lg:ml-64' : 'ml-0'} flex flex-col min-h-screen`}>
                <Navbar toggleSidebar={() => setIsOpen(!isOpen)} userRole="School Administrator" />

                <main className="flex-1 p-6 lg:p-8">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-5xl mx-auto space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
                            <div>
                                <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">Admin Notifications</h1>
                                <p className="text-gray-500 dark:text-gray-400 mt-1 text-lg">School-wide broadcasts and direct staff messages.</p>
                            </div>
                            <div className="flex space-x-2 bg-white dark:bg-gray-800 p-1.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <button onClick={() => setFilter('ALL')} className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${filter === 'ALL' ? 'bg-orange-50 dark:bg-gray-700 text-orange-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>All Alerts</button>
                                <button onClick={() => setFilter('UNREAD')} className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${filter === 'UNREAD' ? 'bg-orange-50 dark:bg-gray-700 text-orange-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                    Unread {feed.filter(n => !n.isRead).length > 0 && <span className="ml-1 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">{feed.filter(n => !n.isRead).length}</span>}
                                </button>
                            </div>
                        </div>
                        
                        <div className="space-y-6">
                            <AnimatePresence>
                                {displayedFeed.length === 0 ? (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                                        <p className="text-gray-500 font-bold">You're all caught up! 🎉</p>
                                    </motion.div>
                                ) : displayedFeed.map((notification) => {
                                    const isReplyAllowed = notification.type === 'BROADCAST' || (notification.role || '').includes('Admin') || (notification.role || '').includes('System');
                                    return (
                                    <motion.div key={notification.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} 
                                        className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border transition-colors ${!notification.isRead ? 'border-orange-300 dark:border-orange-700 bg-orange-50/30 dark:bg-orange-900/10' : 'border-gray-100 dark:border-gray-700'}`}>
                                        
                                        {/* Feed Header */}
                                        <div className="p-6 flex gap-5">
                                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center font-black text-xl shrink-0 shadow-sm">
                                                {notification.avatar}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-bold text-gray-900 dark:text-white text-xl flex items-center gap-3">
                                                            {notification.author} 
                                                            <span className={`text-[11px] px-2.5 py-0.5 rounded-md font-black uppercase tracking-wider ${notification.type === 'BROADCAST' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'}`}>
                                                                {notification.type}
                                                            </span>
                                                        </h3>
                                                        <p className="text-sm text-gray-500 font-semibold mt-0.5">{notification.role} • {notification.timestamp}</p>
                                                    </div>
                                                    {!notification.isRead && (
                                                        <button onClick={() => markAsRead(notification.id)} className="w-3.5 h-3.5 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)] mt-2" title="Mark as read" />
                                                    )}
                                                </div>
                                                <p className="mt-4 text-gray-700 dark:text-gray-300 text-lg leading-relaxed">{notification.content}</p>
                                                
                                                {/* Action Bar */}
                                                <div className="flex items-center gap-6 mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
                                                    <button onClick={() => toggleLike(notification.id)} className={`flex items-center gap-2 text-sm font-bold transition-colors ${notification.userLiked ? 'text-orange-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                                        <span className="text-xl">{notification.userLiked ? '❤️' : '🤍'}</span> {notification.likes > 0 && notification.likes}
                                                    </button>
                                                    {isReplyAllowed && (
                                                    <button onClick={() => document.getElementById(`reply-${notification.id}`)?.focus()} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                                                        💬 Reply {notification.replies.length > 0 && `(${notification.replies.length})`}
                                                    </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Nested Replies Section */}
                                        {(notification.replies.length > 0 || isReplyAllowed) && (
                                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl px-6 py-5 border-t border-gray-100 dark:border-gray-700">
                                            {notification.replies.length > 0 && (
                                                <div className="space-y-4 mb-4">
                                                    {notification.replies.map(reply => (
                                                        <div key={reply.id} className="flex gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center justify-center font-bold text-sm shrink-0">{reply.avatar}</div>
                                                            <div className="flex-1 bg-white dark:bg-gray-700 p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 dark:border-gray-600">
                                                                <div className="flex justify-between items-baseline mb-1">
                                                                    <span className="font-bold text-gray-900 dark:text-white">{reply.author}</span>
                                                                    <span className="text-xs text-gray-500 font-semibold">{reply.timestamp}</span>
                                                                </div>
                                                                <p className="text-gray-700 dark:text-gray-300 mt-1">{reply.text}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            {/* Reply Input */}
                                            {isReplyAllowed && (
                                            <div className="flex gap-4 items-center">
                                                <div className="w-10 h-10 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold text-sm shrink-0">SA</div>
                                                <div className="flex-1 relative">
                                                    <input 
                                                        id={`reply-${notification.id}`}
                                                        type="text" 
                                                        value={replyText[notification.id] || ''}
                                                        onChange={(e) => setReplyText({ ...replyText, [notification.id]: e.target.value })}
                                                        onKeyDown={(e) => e.key === 'Enter' && submitReply(notification.id)}
                                                        placeholder="Write a reply..." 
                                                        className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full pl-5 pr-14 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-white transition-shadow"
                                                    />
                                                    <button onClick={() => submitReply(notification.id)} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 text-sm shadow-sm">🚀</button>
                                                </div>
                                            </div>
                                            )}
                                        </div>
                                        )}
                                    </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </main>
            </div>
        </div>
    );
};
