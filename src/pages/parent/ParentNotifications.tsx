import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useLiveNotifications, type LiveNotification as Notification } from '../../services/useNotifications';

export const ParentNotifications = () => {
    const { feed, markAsRead: markNotificationRead, toggleLike: toggleNotificationLike, reply } = useLiveNotifications();
    const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
    const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

    const toggleLike = (id: string) => {
        const notification = feed.find(n => n.id === id);
        if (notification) toggleNotificationLike(notification);
    };

    const markAsRead = (id: string) => {
        markNotificationRead(id);
        toast.success('Marked as read');
    };

    const submitReply = async (id: string) => {
        if (!replyText[id]?.trim()) return;
        await reply(id, replyText[id], 'P');
        setReplyText({ ...replyText, [id]: '' });
        toast.success('Reply posted!');
    };

    const displayedFeed = filter === 'ALL' ? feed : feed.filter(n => !n.isRead);

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white">Updates & Messages</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Your unified feed for school broadcasts and direct messages.</p>
                </div>
                <div className="flex space-x-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    <button onClick={() => setFilter('ALL')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${filter === 'ALL' ? 'bg-white dark:bg-gray-700 text-orange-500 shadow-sm' : 'text-gray-500'}`}>All</button>
                    <button onClick={() => setFilter('UNREAD')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${filter === 'UNREAD' ? 'bg-white dark:bg-gray-700 text-orange-500 shadow-sm' : 'text-gray-500'}`}>
                        Unread {feed.filter(n => !n.isRead).length > 0 && <span className="ml-1 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">{feed.filter(n => !n.isRead).length}</span>}
                    </button>
                </div>
            </div>
            
            <div className="space-y-6 max-w-3xl">
                <AnimatePresence>
                    {displayedFeed.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <p className="text-gray-500 font-bold">You're all caught up! 🎉</p>
                        </motion.div>
                    ) : displayedFeed.map((notification) => {
                        const isReplyAllowed = notification.type === 'BROADCAST' || notification.role.includes('Admin') || notification.role.includes('System');
                        return (
                        <motion.div key={notification.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} 
                            className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border transition-colors ${!notification.isRead ? 'border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10' : 'border-gray-100 dark:border-gray-700'}`}>
                            
                            {/* Feed Header */}
                            <div className="p-5 flex gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-sm">
                                    {notification.avatar}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                                                {notification.author} 
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${notification.type === 'BROADCAST' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                                    {notification.type}
                                                </span>
                                            </h3>
                                            <p className="text-xs text-gray-500 font-semibold">{notification.role} • {notification.timestamp}</p>
                                        </div>
                                        {!notification.isRead && (
                                            <button onClick={() => markAsRead(notification.id)} className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" title="Mark as read" />
                                        )}
                                    </div>
                                    <p className="mt-3 text-gray-700 dark:text-gray-300 leading-relaxed">{notification.content}</p>
                                    
                                    {/* Action Bar */}
                                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <button onClick={() => toggleLike(notification.id)} className={`flex items-center gap-1.5 text-sm font-bold transition-colors ${notification.userLiked ? 'text-orange-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                            <span className="text-lg">{notification.userLiked ? '❤️' : '🤍'}</span> {notification.likes > 0 && notification.likes}
                                        </button>
                                        {isReplyAllowed && (
                                        <button onClick={() => document.getElementById(`reply-${notification.id}`)?.focus()} className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                                            💬 Reply {notification.replies.length > 0 && `(${notification.replies.length})`}
                                        </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Nested Replies Section */}
                            {(notification.replies.length > 0 || isReplyAllowed) && (
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl px-5 py-4 border-t border-gray-100 dark:border-gray-700">
                                {notification.replies.length > 0 && (
                                    <div className="space-y-4 mb-4">
                                        {notification.replies.map(reply => (
                                            <div key={reply.id} className="flex gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center justify-center font-bold text-xs shrink-0">{reply.avatar}</div>
                                                <div className="flex-1 bg-white dark:bg-gray-700 p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 dark:border-gray-600">
                                                    <div className="flex justify-between items-baseline mb-1">
                                                        <span className="font-bold text-sm text-gray-900 dark:text-white">{reply.author}</span>
                                                        <span className="text-[10px] text-gray-500 font-semibold">{reply.timestamp}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300">{reply.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {/* Reply Input */}
                                {isReplyAllowed && (
                                <div className="flex gap-3 items-center">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">P</div>
                                    <div className="flex-1 relative">
                                        <input 
                                            id={`reply-${notification.id}`}
                                            type="text" 
                                            value={replyText[notification.id] || ''}
                                            onChange={(e) => setReplyText({ ...replyText, [notification.id]: e.target.value })}
                                            onKeyDown={(e) => e.key === 'Enter' && submitReply(notification.id)}
                                            placeholder="Write a reply..." 
                                            className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full pl-4 pr-12 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-white transition-shadow"
                                        />
                                        <button onClick={() => submitReply(notification.id)} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center transition-colors text-xs">🚀</button>
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
    );
};
