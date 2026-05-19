import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { toast } from 'react-hot-toast';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { storage } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { useChatSystem, type ChatCategory } from '../services/chat';
import { useSearchUsersAndClasses } from '../services/searchService';

export const Messages = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('Compose Announcement');
    const tabs = ['Compose Announcement', 'Sent History', 'Scheduled'];
    const [fileName, setFileName] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [recipientSearch, setRecipientSearch] = useState('');
    const { user } = useAuth();
    const currentRole = String(user?.role || '').toUpperCase();
    const canUseAdminAudiences = ['ADMIN', 'PRINCIPAL', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(currentRole);
    const { threads, createCategoryConversation, sendMessage } = useChatSystem();
    const { results: recipientResults } = useSearchUsersAndClasses(recipientSearch, { roles: ['PARENT', 'TEACHER', 'STAFF', 'ADMIN', 'PRINCIPAL', 'ACCOUNTANT'] });
    const [isPublishing, setIsPublishing] = useState(false);

    const audienceToCategories = (audience: string): ChatCategory[] => {
        const normalized = audience.toUpperCase();
        if (normalized === 'TEACHER_CLASS_PARENTS') return [{ target: 'parents', classId: user?.assignedClass || user?.classId || '' }];
        if (normalized === 'ALL') return [{ target: 'parents' }, { target: 'staff' }];
        if (normalized === 'ALL_PARENTS') return [{ target: 'parents' }];
        if (normalized === 'ALL_STAFF') return [{ target: 'staff' }];
        if (normalized === 'PRIMARY_PARENTS') return [{ target: 'parents', section: 'primary' }];
        if (normalized === 'SECONDARY_PARENTS') return [{ target: 'parents', section: 'secondary' }];
        if (normalized === 'PRIMARY_TEACHERS') return [{ target: 'teachers', section: 'primary' }];
        if (normalized === 'SECONDARY_TEACHERS') return [{ target: 'teachers', section: 'secondary' }];
        if (normalized.endsWith('_TEACHERS')) return [{ target: 'teachers', classId: normalized.replace(/_TEACHERS$/, '').replace(/^PRI(\d)$/i, 'Primary $1') }];
        if (normalized.endsWith('_PARENTS')) return [{ target: 'parents', classId: normalized.replace(/_PARENTS$/, '').replace(/^PRI(\d)$/i, 'Primary $1') }];
        return [{ target: 'parents' }];
    };

    const publishAnnouncement = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsPublishing(true);
        const form = new FormData(event.currentTarget);
        const audience = String(form.get('audience') || 'ALL');
        let attachmentUrl = '';
        try {
            if (attachment && user?.schoolId) {
                const fileRef = storageRef(storage, `schools/${user.schoolId}/announcements/${Date.now()}-${attachment.name}`);
                await uploadBytes(fileRef, attachment);
                attachmentUrl = await getDownloadURL(fileRef);
            }
            const title = String(form.get('title') || '').trim();
            const body = String(form.get('message') || '').trim();
            const message = attachmentUrl ? `${body}\n\nAttachment: ${attachmentUrl}` : body;
            const categories = audienceToCategories(audience);
            await Promise.all(categories.map(async (category) => {
                const conversationId = await createCategoryConversation(category, title || undefined);
                await sendMessage(conversationId, message);
            }));
            setFileName('');
            setAttachment(null);
            event.currentTarget.reset();
            toast.success('Message sent to selected recipients.');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to send message.');
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="min-h-screen bg-orange-50 dark:bg-gray-900 transition-colors duration-500">
            {isOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsOpen(false)} />
            )}
            <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
            <div className={`transition-all duration-500 ${isOpen ? 'lg:ml-64' : 'ml-0'} flex flex-col min-h-screen`}>
                <Navbar toggleSidebar={() => setIsOpen(!isOpen)} userRole="School Administrator" />
                <main className="flex-1 p-6 lg:p-8">
                    <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white mb-6">Announcements & Communications</h1>

                    <div className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                        {tabs.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-3 px-4 font-semibold whitespace-nowrap transition-colors ${activeTab === tab ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'Compose Announcement' && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 max-w-4xl mx-auto">
                            <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-6">New Announcement</h3>
                            <form onSubmit={publishAnnouncement} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Target Audience</label>
                                        <select name="audience" required className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none">
                                            {canUseAdminAudiences ? (
                                                <>
                                                    <option value="ALL">Entire School Community</option>
                                                    <option value="ALL_PARENTS">All Parents</option>
                                                    <option value="ALL_STAFF">All Staff & Teachers</option>
                                                    <option value="PRIMARY_PARENTS">Parents in Primary Section</option>
                                                    <option value="SECONDARY_PARENTS">Parents in Secondary Section</option>
                                                    <option value="PRIMARY_TEACHERS">Teachers in Primary Section</option>
                                                    <option value="SECONDARY_TEACHERS">Teachers in Secondary Section</option>
                                                    <optgroup label="Primary Parents">
                                                        <option value="PRI1_PARENTS">Primary 1 Parents</option><option value="PRI2_PARENTS">Primary 2 Parents</option><option value="PRI3_PARENTS">Primary 3 Parents</option>
                                                        <option value="PRI4_PARENTS">Primary 4 Parents</option><option value="PRI5_PARENTS">Primary 5 Parents</option><option value="PRI6_PARENTS">Primary 6 Parents</option>
                                                    </optgroup>
                                                    <optgroup label="Secondary Parents">
                                                        <option value="JSS1_PARENTS">JSS 1 Parents</option><option value="JSS2_PARENTS">JSS 2 Parents</option><option value="JSS3_PARENTS">JSS 3 Parents</option>
                                                        <option value="SS1_PARENTS">SS 1 Parents</option><option value="SS2_PARENTS">SS 2 Parents</option><option value="SS3_PARENTS">SS 3 Parents</option>
                                                    </optgroup>
                                                    <optgroup label="Class Teachers">
                                                        <option value="PRI1_TEACHERS">Primary 1 Teachers</option><option value="PRI2_TEACHERS">Primary 2 Teachers</option><option value="PRI3_TEACHERS">Primary 3 Teachers</option>
                                                        <option value="JSS1_TEACHERS">JSS 1 Teachers</option><option value="JSS2_TEACHERS">JSS 2 Teachers</option><option value="SS1_TEACHERS">SS 1 Teachers</option>
                                                    </optgroup>
                                                </>
                                            ) : (
                                                <option value="TEACHER_CLASS_PARENTS">Parents in My Class</option>
                                            )}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Category</label>
                                        <select name="category" required className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none">
                                            <option value="GENERAL">General News</option>
                                            <option value="ACADEMIC">Academic / Exams</option>
                                            <option value="FINANCE">Finance / Fees</option>
                                            <option value="URGENT">Urgent Alert</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Recipient Search</label>
                                    <input type="text" value={recipientSearch} onChange={(event) => setRecipientSearch(event.target.value)} placeholder="Search parents, staff, teachers, or classes..." className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                    {recipientSearch.trim() && (
                                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                                                <p className="font-black text-gray-700 dark:text-gray-200 mb-2">Users</p>
                                                {(recipientResults.users || []).slice(0, 5).map((result: any) => <p key={result.id} className="text-gray-600 dark:text-gray-300 py-1">{result.name} <span className="text-xs text-gray-400">{result.meta}</span></p>)}
                                                {(recipientResults.users || []).length === 0 && <p className="text-gray-400">No users found.</p>}
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                                                <p className="font-black text-gray-700 dark:text-gray-200 mb-2">Classes</p>
                                                {(recipientResults.classes || []).slice(0, 5).map((result: any) => <p key={result.id} className="text-gray-600 dark:text-gray-300 py-1">{result.name} <span className="text-xs text-gray-400">{result.meta}</span></p>)}
                                                {(recipientResults.classes || []).length === 0 && <p className="text-gray-400">No classes found.</p>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <input name="title" type="text" required placeholder="Announcement Title" maxLength={150} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none font-bold text-lg" />
                                </div>
                                <div>
                                    <textarea name="message" required rows={6} maxLength={2000} placeholder="Type your message here..." className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none resize-none"></textarea>
                                </div>

                                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative">
                                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => { setAttachment(e.target.files?.[0] || null); setFileName(e.target.files?.[0]?.name || ''); }} />
                                    <div className="text-gray-500 dark:text-gray-400">
                                        <span className="text-3xl block mb-2">📎</span>
                                        <p className="font-bold">{fileName ? `Attached: ${fileName}` : 'Click or drag to attach Circular, PDF, or Image'}</p>
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <button type="button" className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-xl font-bold transition-colors">Save as Draft</button>
                                    <button type="submit" disabled={isPublishing} className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-colors shadow-md disabled:opacity-70">{isPublishing ? 'Sending...' : 'Send Message'}</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'Sent History' && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm">
                                    <tr><th className="p-4 font-semibold">Date</th><th className="p-4 font-semibold">Title</th><th className="p-4 font-semibold">Audience</th><th className="p-4 font-semibold">Read Receipts</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                                    {threads.length === 0 ? (
                                        <tr><td colSpan={4} className="p-4 text-center font-semibold text-gray-500">No messages sent yet.</td></tr>
                                    ) : threads.map((conversation: any) => {
                                        const participants = Object.keys(conversation.participantMap || {}).length;
                                        const unread = Object.keys(conversation.unreadBy || {}).filter((uid) => conversation.unreadBy?.[uid]).length;
                                        const readPercent = participants ? Math.round(((participants - unread) / participants) * 100) : 0;
                                        return (
                                            <tr key={conversation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="p-4 text-sm font-semibold">{conversation.lastTimestamp ? new Date(conversation.lastTimestamp).toLocaleDateString() : ''}</td>
                                                <td className="p-4 font-bold text-gray-900 dark:text-white">{conversation.title || conversation.lastMessage} <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded ml-2">{conversation.type}</span></td>
                                                <td className="p-4">{conversation.category?.target || 'Direct'}</td>
                                                <td className="p-4"><div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5"><div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${readPercent}%` }}></div></div><span className="text-xs text-gray-500 mt-1 block">{readPercent}% Read ({participants - unread}/{participants})</span></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};
