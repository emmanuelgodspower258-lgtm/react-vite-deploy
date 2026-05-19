import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import Register from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Academics } from './pages/Academics';
import { StudentsParents } from './pages/StudentsParents';
import { StaffManagement } from './pages/StaffManagement';
import { FeeManagement } from './pages/FeeManagement';
import { ReportCards } from './pages/ReportCards';
import { Messages } from './pages/Messages';
import { Assignments } from './pages/Assignments';
import { Attendance } from './pages/Attendance';
import { Grades } from './pages/Grades';
import { SchoolSettings } from './pages/SchoolSettings';
import { Schools } from './pages/Schools';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { AdminNotifications } from './pages/AdminNotifications';
import { TeacherPortal } from './pages/teacher/TeacherPortal';
import { ParentPortal } from './pages/parent/ParentPortal';
import { useChatSystem, type ChatCategory } from './services/chat';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { useSearchUsersAndClasses } from './services/searchService';

const ChatWidget = () => {
    const { isAuthenticated, user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'list' | 'chat' | 'new'>('list');
    const [activeChatId, setActiveChatId] = useState('');
    const [targetUid, setTargetUid] = useState('');
    const [category, setCategory] = useState('DIRECT');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [messageText, setMessageText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const { threads, messages, unreadCount, createDirectConversation, createCategoryConversation, sendMessage, markRead } = useChatSystem(activeChatId);
    const { results: chatSearch } = useSearchUsersAndClasses(searchQuery, { roles: ['PARENT', 'TEACHER', 'STAFF', 'ADMIN', 'PRINCIPAL', 'ACCOUNTANT'] });
    const activeThread = threads.find(thread => thread.id === activeChatId);
    const availableUsers = (chatSearch.users || []).map((result: any) => result.record).filter((item: any) => item.id !== user?.id);
    const availableClasses = (chatSearch.classes || []).map((result: any) => result.record);
    const currentRole = String(user?.role || '').toUpperCase();

    const openChat = async (chatId: string) => {
        setActiveChatId(chatId);
        setView('chat');
        await markRead(chatId);
    };

    const categoryFromSelection = (): ChatCategory | null => {
        if (category === 'ALL_STAFF') return { target: 'staff' };
        if (category === 'ALL_PARENTS') return { target: 'parents' };
        if (category === 'PRIMARY_PARENTS') return { target: 'parents', section: 'primary' };
        if (category === 'SECONDARY_PARENTS') return { target: 'parents', section: 'secondary' };
        if (category === 'CLASS_PARENTS') return { target: 'parents', classId: selectedClassId || user?.assignedClass || '' };
        if (category === 'CLASS_TEACHERS') return { target: 'teachers', classId: selectedClassId };
        return null;
    };

    const startConversation = async () => {
        const target = availableUsers.find((item: any) => item.id === targetUid || item.uid === targetUid);
        const chatId = target
            ? await createDirectConversation(target)
            : await createCategoryConversation(categoryFromSelection() as ChatCategory);
        setActiveChatId(chatId);
        setView('chat');
    };

    const submitMessage = async () => {
        if (!activeChatId || !messageText.trim()) return;
        await sendMessage(activeChatId, messageText);
        setMessageText('');
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length, activeChatId]);

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key="chat-widget"
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="bg-white dark:bg-gray-800 w-[360px] h-[500px] mb-4 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-orange-500 text-white p-4 font-bold flex justify-between items-center shadow-sm z-10">
                            <div className="flex items-center gap-2">
                                {view !== 'list' && (
                                    <button onClick={() => setView('list')} className="hover:bg-orange-600 px-2 py-1 rounded-md transition-colors">&larr;</button>
                                )}
                                <span>{view === 'list' ? 'Messages' : view === 'new' ? 'New Message' : activeThread?.title || 'Chat'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                {view === 'list' && (
                                    <button onClick={() => setView('new')} className="hover:bg-orange-600 px-2 py-1 rounded-md transition-colors" title="New Message">📝</button>
                                )}
                                <button onClick={() => setIsOpen(false)} className="hover:bg-orange-600 px-2 py-1 rounded-md transition-colors text-lg">&times;</button>
                            </div>
                        </div>

                        {/* View: Conversation List */}
                        {view === 'list' && (
                            <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800">
                                {threads.length === 0 ? (
                                    <div className="p-6 text-center text-sm font-semibold text-gray-500">No conversations yet.</div>
                                ) : threads.map(thread => {
                                    const unread = thread.unreadBy?.[user?.id || ''] ? 1 : 0;
                                    return (
                                        <div key={thread.id} className="p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer flex items-center gap-3 transition-colors" onClick={() => openChat(thread.id)}>
                                            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black shrink-0">{thread.title?.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'CH'}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline mb-1"><p className="font-bold text-gray-800 dark:text-white text-sm truncate">{thread.title}</p><span className="text-[10px] font-bold text-orange-500">{thread.type}</span></div>
                                                <p className={`text-xs truncate ${unread > 0 ? 'text-gray-800 dark:text-white font-bold' : 'text-gray-500'}`}>{thread.lastMessage || 'No messages yet'}</p>
                                            </div>
                                            {unread > 0 && <div className="w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-black flex items-center justify-center shrink-0">{unread}</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* View: New Message Setup */}
                        {view === 'new' && (
                            <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-5 space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Search Users & Classes</label>
                                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search parents, staff, teachers, classes..." className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-500 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Message Category</label>
                                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-500 dark:text-white">
                                        <option value="DIRECT">Direct Chat</option>
                                        {['ADMIN', 'PRINCIPAL', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(currentRole) && <option value="ALL_STAFF">All Staff</option>}
                                        {['ADMIN', 'PRINCIPAL', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(currentRole) && <option value="ALL_PARENTS">All Parents</option>}
                                        <option value="CLASS_PARENTS">Parents in Class</option>
                                        {['ADMIN', 'PRINCIPAL', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(currentRole) && <option value="PRIMARY_PARENTS">Parents in Primary Section</option>}
                                        {['ADMIN', 'PRINCIPAL', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(currentRole) && <option value="SECONDARY_PARENTS">Parents in Secondary Section</option>}
                                        {['ADMIN', 'PRINCIPAL', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(currentRole) && <option value="CLASS_TEACHERS">Teachers in Class</option>}
                                    </select>
                                </div>
                                <div className="flex items-center gap-3">
                                    <hr className="flex-1 border-gray-200 dark:border-gray-700" />
                                    <span className="text-xs text-gray-400 font-bold uppercase">OR</span>
                                    <hr className="flex-1 border-gray-200 dark:border-gray-700" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Direct Message</label>
                                    <select value={targetUid} onChange={(e) => setTargetUid(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-500 dark:text-white">
                                        <option value="">Select user...</option>
                                        {availableUsers.map((item: any) => <option key={item.id} value={item.id}>{`${item.firstName || item.name || ''} ${item.lastName || ''}`.trim() || item.email} ({item.role})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Class Target</label>
                                    <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-500 dark:text-white">
                                        <option value="">Select class...</option>
                                        {availableClasses.map((classRecord: any) => {
                                            const className = classRecord.name || [classRecord.grade, classRecord.section].filter(Boolean).join(' ') || classRecord.id;
                                            return <option key={classRecord.id} value={className}>{className}</option>;
                                        })}
                                    </select>
                                </div>
                                <button onClick={startConversation} disabled={category === 'DIRECT' ? !targetUid : !categoryFromSelection() || (['CLASS_PARENTS', 'CLASS_TEACHERS'].includes(category) && !selectedClassId && !user?.assignedClass)} className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-orange-600 transition-colors mt-2 disabled:opacity-60">Start Conversation</button>
                            </div>
                        )}

                        {/* View: Active Chat Thread */}
                        {view === 'chat' && (
                            <>
                                <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900 flex flex-col gap-4">
                                    {messages.length === 0 ? <div className="text-center text-sm font-semibold text-gray-500 mt-8">No messages yet.</div> : messages.map((message: any) => {
                                        const mine = message.senderId === user?.id;
                                        return (
                                            <div key={message.id} className={`${mine ? 'bg-orange-100 dark:bg-orange-900/40 self-end text-orange-900 dark:text-orange-100 border-orange-200 dark:border-orange-800/50 rounded-tr-sm' : 'bg-white dark:bg-gray-700 self-start text-gray-800 dark:text-white border-gray-100 dark:border-gray-600 rounded-tl-sm'} p-3.5 rounded-2xl text-sm shadow-sm max-w-[85%] border`}>
                                                {message.text || message.message}
                                                <span className="text-[10px] opacity-70 block mt-1.5 font-medium">{new Date(message.timestamp).toLocaleTimeString()}</span>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                                <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
                                    <button className="text-gray-400 hover:text-orange-500 transition-colors text-lg" title="Attach Document/Image">📎</button>
                                    <button className="text-gray-400 hover:text-orange-500 transition-colors text-lg" title="Insert Emoji">😀</button>
                                    <input type="text" value={messageText} onChange={(e) => setMessageText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitMessage()} placeholder="Type your message..." className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-2 outline-none text-sm font-medium dark:text-white border border-transparent focus:border-orange-300 dark:focus:border-orange-700 transition-colors" />
                                    <button onClick={submitMessage} className="w-9 h-9 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center font-bold transition-transform hover:scale-105 active:scale-95 shrink-0 shadow-sm">➤</button>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <button onClick={() => setIsOpen(!isOpen)} className="relative w-16 h-16 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl transition-transform hover:scale-105 active:scale-95">
                💬
                {!isOpen && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 border-4 border-white dark:border-gray-900 text-white text-xs font-black w-7 h-7 flex items-center justify-center rounded-full">
                        {unreadCount}
                    </span>
                )}
            </button>
        </div>
    );
};

const ProtectedRoute = ({ children, allowedRoles }: { children: JSX.Element, allowedRoles?: string[] }) => {
    const { isAuthenticated, user } = useAuth();
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    const rawRole = String(user?.role || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
    const roleAliases: Record<string, string> = {
        STAFF: 'TEACHER',
        STAFF_TEACHER: 'TEACHER',
        TEACHERS: 'TEACHER',
        SUBJECT_TEACHER: 'TEACHER',
        FORM_MASTER: 'TEACHER',
        FORM_TEACHER: 'TEACHER',
        CLASS_TEACHER: 'TEACHER',
        PARENTS: 'PARENT',
        GUARDIAN: 'PARENT',
        GUARDIANS: 'PARENT',
        ADMINISTRATOR: 'ADMIN',
        SCHOOL_ADMIN: 'ADMIN',
        SUPERADMIN: 'SUPER_ADMIN',
        SUPER_ADMINISTRATOR: 'SUPER_ADMIN',
    };
    const role = roleAliases[rawRole] || rawRole;
    if (allowedRoles && role && !allowedRoles.includes(role)) {
        if (role === 'TEACHER') return <Navigate to="/teacher" replace />;
        if (role === 'PARENT') return <Navigate to="/parent" replace />;
        if (['ADMIN', 'SUPER_ADMIN', 'PRINCIPAL', 'ACCOUNTANT'].includes(role)) return <Navigate to="/" replace />;
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
                <div className="max-w-lg w-full rounded-3xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-6 text-red-700 dark:text-red-200">
                    <h1 className="text-xl font-black mb-2">Account role is not configured</h1>
                    <p className="text-sm font-semibold">Your profile role is "{user?.role}". Please set it to TEACHER, PARENT, ADMIN, or SUPER_ADMIN in /users/{user?.id}.</p>
                </div>
            </div>
        );
    }
    return children;
};

const AppContent = () => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    // Automatically handle system Light/Dark mode changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: any) => {
            if (e.matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };

        // Set initial theme on app load
        if (mediaQuery.matches) document.documentElement.classList.add('dark');

        // Listen for changes
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div></div>;
    }

    return (
        <>
            {/* AnimatePresence allows components to animate out when they are removed from the React tree */}
            <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    {/* Public Route */}
                <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
                
                {/* SECRET ROUTE: Only you know this exists to create new school admins! */}
                <Route path="/system-admin-setup-99x" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />

                {/* Protected Routes - ADMIN */}
                <Route path="/" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'PRINCIPAL']}><Dashboard /></ProtectedRoute>} />
                <Route path="/schools" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><Schools /></ProtectedRoute>} />
                <Route path="/academics" element={<ProtectedRoute allowedRoles={['ADMIN', 'PRINCIPAL']}><Academics /></ProtectedRoute>} />
                <Route path="/students" element={<ProtectedRoute allowedRoles={['ADMIN', 'PRINCIPAL']}><StudentsParents /></ProtectedRoute>} />
                <Route path="/staff" element={<ProtectedRoute allowedRoles={['ADMIN', 'PRINCIPAL']}><StaffManagement /></ProtectedRoute>} />
                <Route path="/finance" element={<ProtectedRoute allowedRoles={['ADMIN', 'PRINCIPAL', 'ACCOUNTANT']}><FeeManagement /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute allowedRoles={['ADMIN', 'PRINCIPAL']}><ReportCards /></ProtectedRoute>} />
                <Route path="/messages" element={<ProtectedRoute allowedRoles={['ADMIN', 'PRINCIPAL', 'ACCOUNTANT', 'TEACHER']}><Messages /></ProtectedRoute>} />
                <Route path="/assignments" element={<ProtectedRoute allowedRoles={['TEACHER']}><Assignments /></ProtectedRoute>} />
                <Route path="/attendance" element={<ProtectedRoute allowedRoles={['ADMIN', 'PRINCIPAL', 'TEACHER']}><Attendance /></ProtectedRoute>} />
                <Route path="/grades" element={<ProtectedRoute allowedRoles={['ADMIN', 'PRINCIPAL', 'TEACHER']}><Grades /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute allowedRoles={['ADMIN', 'PRINCIPAL']}><AdminNotifications /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute allowedRoles={['ADMIN', 'PRINCIPAL']}><SchoolSettings /></ProtectedRoute>} />

                {/* Protected Routes - TEACHER */}
                <Route path="/teacher/*" element={<ProtectedRoute allowedRoles={['TEACHER']}><RouteErrorBoundary label="Teacher portal"><TeacherPortal /></RouteErrorBoundary></ProtectedRoute>} />

                {/* Protected Routes - PARENT */}
                <Route path="/parent/*" element={<ProtectedRoute allowedRoles={['PARENT']}><RouteErrorBoundary label="Parent portal"><ParentPortal /></RouteErrorBoundary></ProtectedRoute>} />

                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </AnimatePresence>
            <Toaster position="top-right" />

            {/* Global Persistent Chat Widget */}
        {isAuthenticated && <ChatWidget />}
        </>
    );
};

export const App = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </BrowserRouter>
    );
};
