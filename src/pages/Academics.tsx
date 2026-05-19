import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useGetClassesQuery, useCreateClassMutation } from '../classesApi';
import { useGetDashboardSummaryQuery } from '../dashboardApi';
import { useLocation } from 'react-router-dom';
import { useCreateSubjectMutation, useGetSubjectsQuery } from '../subjectsApi';
import { useGetStaffQuery } from '../staffApi';
import { useCreateMutation, useSetSchoolValue } from '../services/firestoreHooks';
import { useGetStudentsQuery, useUpdateStudentMutation } from '../studentsApi';
import { normalizeClassName } from '../services/schoolPaths';

export const Academics = () => {
    const { data: stats } = useGetDashboardSummaryQuery();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(true);
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'Sessions & Terms');

    // Modal States
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [showClassModal, setShowClassModal] = useState(false);
    const [showSubjectModal, setShowSubjectModal] = useState(false);
    const [showAllocationModal, setShowAllocationModal] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedTimetableClass, setSelectedTimetableClass] = useState('JSS 1');
    const [showPromotionList, setShowPromotionList] = useState(false);
    const [timetableEntries, setTimetableEntries] = useState<Record<string, string>>({});

    const [classFormData, setClassFormData] = useState({
        name: '',
        grade: '',
        section: '',
        capacity: 30,
        teacherId: ''
    });

    const { data: classesData = [], isLoading: isLoadingClasses } = useGetClassesQuery();
    const { data: subjectsData = [] } = useGetSubjectsQuery();
    const { data: staffList = [] } = useGetStaffQuery();
    const { data: students = [] } = useGetStudentsQuery();
    const [createClass, { isLoading: isCreatingClass }] = useCreateClassMutation();
    const [createSubject, { isLoading: isCreatingSubject }] = useCreateSubjectMutation();
    const [updateStudent] = useUpdateStudentMutation();
    const [saveSettings] = useSetSchoolValue('settings');
    const [saveTimetable] = useSetSchoolValue(`timetables/${selectedTimetableClass.replace(/[.#$/[\]]/g, '_')}`);
    const [createCalendarEvent] = useCreateMutation('calendarEvents');

    const tabs = ['Sessions & Terms', 'Classes', 'Subjects', 'Timetables', 'Academic Calendar', 'Promotions'];

    const calendarWeeks = Array.from({ length: 14 }, (_, i) => {
        const weekNum = i + 1;
        let title = `Week ${weekNum} - Regular Learning & Lectures`;
        let type = 'learning';
        if (weekNum === 4) { title = `Week ${weekNum} - 1st Continuous Assessment (CA)`; type = 'ca'; }
        else if (weekNum === 8) { title = `Week ${weekNum} - 2nd Continuous Assessment (CA)`; type = 'ca'; }
        else if (weekNum === 11) { title = `Week ${weekNum} - End of Term Examinations`; type = 'exam'; }
        return { weekNum, title, type };
    });

    // Dynamic Timetable Generation
    const isPrimary = selectedTimetableClass.includes('Primary');
    const timetableSlots = isPrimary ? [
        { id: 1, time: '08:00 AM - 08:45 AM', isBreak: false },
        { id: 2, time: '08:45 AM - 09:30 AM', isBreak: false },
        { id: 3, time: '09:30 AM - 10:00 AM', isBreak: true, label: 'Break' },
        { id: 4, time: '10:00 AM - 10:45 AM', isBreak: false },
        { id: 5, time: '10:45 AM - 11:30 AM', isBreak: false },
        { id: 6, time: '11:30 AM - 12:15 PM', isBreak: false },
        { id: 7, time: '12:15 PM - 01:00 PM', isBreak: false }
    ] : [
        { id: 1, time: '08:00 AM - 08:40 AM', isBreak: false },
        { id: 2, time: '08:40 AM - 09:20 AM', isBreak: false },
        { id: 3, time: '09:20 AM - 10:00 AM', isBreak: false },
        { id: 4, time: '10:00 AM - 10:15 AM', isBreak: true, label: 'Short Break' },
        { id: 5, time: '10:15 AM - 10:55 AM', isBreak: false },
        { id: 6, time: '10:55 AM - 11:35 AM', isBreak: false },
        { id: 7, time: '11:35 AM - 12:05 PM', isBreak: true, label: 'Long Break' },
        { id: 8, time: '12:05 PM - 12:45 PM', isBreak: false },
        { id: 9, time: '12:45 PM - 01:25 PM', isBreak: false },
        { id: 10, time: '01:25 PM - 02:00 PM', isBreak: false }
    ];

    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createClass(classFormData).unwrap();
            setShowClassModal(false);
            setClassFormData({ name: '', grade: '', section: '', capacity: 30, teacherId: '' });
            toast.success('Class created successfully!');
        } catch (error) {
            toast.error('Failed to create class.');
        }
    };

    const handleCreateSubject = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const teacherId = String(form.get('teacherId') || '');
        const teacher = staffList.find((staff: any) => staff.uid === teacherId || staff.id === teacherId);
        const assignedClass = String(form.get('assignedClass') || '');
        try {
            await createSubject({
                name: String(form.get('name') || '').trim(),
                classId: assignedClass,
                className: assignedClass,
                assignedClasses: [assignedClass],
                teacherId,
                teacherUid: teacher?.uid || teacherId,
                teacherName: teacher ? `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() : '',
            }).unwrap();
            setShowSubjectModal(false);
            toast.success('Subject created successfully!');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to create subject.');
        }
    };

    const handleCreateSession = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        await saveSettings({
            currentSession: String(form.get('sessionYear') || ''),
            currentTerm: '1st Term',
            terms: ['1st Term', '2nd Term', '3rd Term'],
        }).unwrap();
        setShowSessionModal(false);
        toast.success('Academic Session Created!');
    };

    const handleSaveTimetable = async () => {
        await saveTimetable({
            className: selectedTimetableClass,
            entries: timetableEntries,
            slots: timetableSlots,
            updatedAt: new Date().toISOString(),
        }).unwrap();
        toast.success('Timetable saved successfully!');
    };

    const handleAddEvent = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        await createCalendarEvent({
            title: String(form.get('title') || ''),
            date: String(form.get('date') || ''),
            type: 'CUSTOM',
        }).unwrap();
        setShowEventModal(false);
        toast.success('Event added to calendar!');
    };

    const handleExecutePromotion = async () => {
        const candidates = students.filter((student: any) => normalizeClassName(student.currentClass || student.classId) === normalizeClassName('JSS 1'));
        await Promise.all(candidates.map((student: any) => updateStudent({
            id: student.id,
            previousClass: student.currentClass || student.classId || '',
            currentClass: 'JSS 2',
            promotedAt: new Date().toISOString(),
        }).unwrap()));
        setShowPromotionList(false);
        toast.success('Bulk promotion executed successfully!');
    };

    const handleUpdateAllocation = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const teacherId = String(form.get('teacherId') || '');
        const teacher = staffList.find((staff: any) => staff.uid === teacherId || staff.id === teacherId);
        await createSubject({
            name: String(form.get('subjects') || '').trim(),
            assignedClasses: String(form.get('classes') || '').split(',').map((item) => item.trim()).filter(Boolean),
            teacherId,
            teacherUid: teacher?.uid || teacherId,
            teacherName: teacher ? `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() : '',
        }).unwrap();
        setShowAllocationModal(false);
        toast.success('Teacher allocation updated!');
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
            {isOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setIsOpen(false)} />}
            <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

            <div className={`transition-all duration-500 ${isOpen ? 'lg:ml-64' : 'ml-0'} flex flex-col min-h-screen`}>
                <Navbar toggleSidebar={() => setIsOpen(!isOpen)} userRole="School Administrator" />

                <main className="flex-1 p-6 lg:p-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white">Academics Management</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage classes, subjects, schedules, and terms.</p>
                    </div>

                    {/* Module Navigation Tabs */}
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

                    {/* Tab Content */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} key={activeTab}>

                        {activeTab === 'Sessions & Terms' && (
                            <div className="space-y-6">
                                <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 shadow-sm text-white flex justify-between items-center">
                                    <div>
                                        <p className="text-orange-100 font-semibold mb-1 uppercase tracking-wider text-sm">Currently Active Academic Period</p>
                                        <h2 className="text-3xl font-black">{stats?.currentSession || '2024/2025'} Session <span className="text-orange-200 font-normal mx-2">|</span> {stats?.currentTerm || '1st Term'}</h2>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Academic Sessions History</h3>
                                        <button onClick={() => setShowSessionModal(true)} className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-xl font-semibold transition-colors text-sm">
                                            + Create New Session
                                        </button>
                                    </div>
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                                            <tr>
                                                <th className="p-4 font-semibold">Session</th>
                                                <th className="p-4 font-semibold">Terms Configured</th>
                                                <th className="p-4 font-semibold">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="p-4 font-bold">2024/2025</td>
                                                <td className="p-4">1st Term, 2nd Term, 3rd Term</td>
                                                <td className="p-4"><span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">ACTIVE</span></td>
                                            </tr>
                                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="p-4 font-bold">2023/2024</td>
                                                <td className="p-4">1st Term, 2nd Term, 3rd Term</td>
                                                <td className="p-4"><span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-full text-xs font-bold">ARCHIVED</span></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Classes' && (
                            <div className="space-y-8">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Class Structure</h3>
                                    <button onClick={() => setShowClassModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-all">+ Add New Class</button>
                                </div>

                                {isLoadingClasses ? (
                                    <div className="flex justify-center items-center py-20">
                                        <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                                    </div>
                                ) : classesData.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {classesData.map((cls: any) => (
                                            <div key={cls.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h4 className="text-2xl font-black text-gray-800 dark:text-white group-hover:text-orange-500 transition-colors">{cls.name}</h4>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Grade {cls.grade} <span className="mx-2">•</span> Section {cls.section}</p>
                                                    </div>
                                                    <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-3 py-1.5 rounded-lg text-sm font-bold flex flex-col items-center">
                                                        <span>{cls.studentCount || 0} / {cls.capacity}</span>
                                                        <span className="text-[10px] uppercase tracking-wider opacity-70">Students</span>
                                                    </div>
                                                </div>

                                                <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold mb-1">Form Master</p>
                                                        <div className="flex items-center space-x-2">
                                                            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                                                                {cls.teacherName ? cls.teacherName.charAt(0) : '?'}
                                                            </div>
                                                            <p className="text-sm font-bold text-gray-800 dark:text-white">{cls.teacherName || 'Not Assigned'}</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setShowClassModal(true)} className="text-orange-500 hover:text-orange-600 text-sm font-bold transition-colors">Edit Class</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                                        <div className="text-5xl mb-4">🏫</div>
                                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">No Classes Found</h3>
                                        <p className="text-gray-500 dark:text-gray-400 mb-6">Your school has no classes configured in the database yet.</p>
                                        <button onClick={() => setShowClassModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all">Create First Class</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'Subjects' && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Subject Allocation Matrix</h3>
                                    <button onClick={() => setShowSubjectModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-semibold transition-colors text-sm shadow-sm">
                                        + Add New Subject
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                                            <tr>
                                                <th className="p-4 font-semibold">Assigned Subjects</th>
                                                <th className="p-4 font-semibold">Assigned Classes</th>
                                                <th className="p-4 font-semibold">Subject Teacher</th>
                                                <th className="p-4 font-semibold">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                                            {subjectsData.length === 0 ? (
                                                <tr><td colSpan={4} className="p-4 text-center font-semibold text-gray-500">No subjects configured yet.</td></tr>
                                            ) : subjectsData.map((subject: any) => (
                                                <tr key={subject.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <td className="p-4 font-bold text-gray-800 dark:text-white">{subject.name}</td>
                                                    <td className="p-4">
                                                        <div className="flex flex-wrap gap-2">
                                                            {(subject.assignedClasses || [subject.className || subject.classId]).filter(Boolean).map((className: string) => (
                                                                <span key={className} className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300">{className}</span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 flex items-center"><div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold mr-2">{subject.teacherName?.[0] || '?'}</div> {subject.teacherName || 'Not Assigned'}</td>
                                                    <td className="p-4 text-orange-500 font-semibold cursor-pointer hover:underline" onClick={() => setShowAllocationModal(true)}>Modify Allocation</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Timetables' && (
                            <div className="flex flex-col lg:flex-row gap-6">
                                {/* Sidebar for Classes */}
                                <div className="w-full lg:w-64 space-y-4 shrink-0">
                                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
                                        <h4 className="font-bold text-gray-500 dark:text-gray-400 mb-3 text-xs uppercase tracking-widest">Primary School</h4>
                                        <ul className="space-y-1 mb-6">
                                            {['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'].map(c => (
                                                <li key={c} onClick={() => setSelectedTimetableClass(c)} className={`p-2.5 rounded-xl cursor-pointer text-sm font-bold transition-all ${selectedTimetableClass === c ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>{c}</li>
                                            ))}
                                        </ul>
                                        <h4 className="font-bold text-gray-500 dark:text-gray-400 mb-3 text-xs uppercase tracking-widest">Secondary School</h4>
                                        <ul className="space-y-1">
                                            {['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'].map(c => (
                                                <li key={c} onClick={() => setSelectedTimetableClass(c)} className={`p-2.5 rounded-xl cursor-pointer text-sm font-bold transition-all ${selectedTimetableClass === c ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>{c}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Main Editable Grid */}
                                <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                                        <h3 className="font-bold text-lg text-gray-800 dark:text-white">Active Timetable: <span className="text-orange-500">{selectedTimetableClass}</span></h3>
                                        <button onClick={handleSaveTimetable} className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all">Save Changes</button>
                                    </div>
                                    <div className="overflow-x-auto p-5">
                                        <table className="w-full text-left border-collapse min-w-[800px]">
                                            <thead>
                                                <tr>
                                                    <th className="p-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 w-28 text-sm font-bold text-gray-600 dark:text-gray-300">Time</th>
                                                    <th className="p-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-sm font-bold text-gray-600 dark:text-gray-300">Mon</th>
                                                    <th className="p-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-sm font-bold text-gray-600 dark:text-gray-300">Tue</th>
                                                    <th className="p-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-sm font-bold text-gray-600 dark:text-gray-300">Wed</th>
                                                    <th className="p-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-sm font-bold text-gray-600 dark:text-gray-300">Thu</th>
                                                    <th className="p-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-sm font-bold text-gray-600 dark:text-gray-300">Fri</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {timetableSlots.map((slot) => (
                                                    <tr key={slot.id}>
                                                        <td className="p-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/20">
                                                            <input type="text" defaultValue={slot.time} onChange={(e) => setTimetableEntries(prev => ({ ...prev, [`${slot.id}-time`]: e.target.value }))} required className="w-full bg-transparent font-bold text-xs text-gray-600 dark:text-gray-400 border border-transparent hover:border-gray-300 dark:hover:border-gray-600 outline-none focus:ring-2 focus:ring-orange-500 rounded p-1 transition-colors" />
                                                        </td>
                                                        {Array.from({ length: 5 }).map((_, colIdx) => (
                                                            <td key={colIdx} colSpan={slot.isBreak && colIdx === 0 ? 5 : 1} className={`p-1 border border-gray-200 dark:border-gray-700 ${slot.isBreak ? 'bg-gray-100 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800'} ${slot.isBreak && colIdx !== 0 ? 'hidden' : ''}`}>
                                                                {slot.isBreak ? (
                                                                    <div className="w-full h-full min-h-[40px] flex items-center justify-center text-gray-400 font-bold text-sm tracking-widest uppercase opacity-50">{slot.label}</div>
                                                                ) : (
                                                                    <textarea
                                                                        onChange={(e) => setTimetableEntries(prev => ({ ...prev, [`${slot.id}-${colIdx}`]: e.target.value }))}
                                                                        className="w-full h-full min-h-[60px] p-2 text-sm font-semibold bg-transparent border-2 border-transparent hover:border-orange-200 dark:hover:border-orange-900/50 focus:border-orange-500 dark:focus:border-orange-500 rounded-lg outline-none resize-none transition-colors dark:text-white placeholder-gray-300 dark:placeholder-gray-600"
                                                                        placeholder="+ Add Subject"
                                                                    ></textarea>
                                                                )}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Academic Calendar' && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 max-w-6xl mx-auto">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Term Schedule (14 Weeks)</h3>
                                    <button onClick={() => setShowEventModal(true)} className="bg-orange-500 hover:bg-orange-600 transition-colors text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm">+ Add Custom Event</button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                                    {calendarWeeks.map((week) => (
                                        <div key={week.weekNum} className={`group relative flex flex-col justify-between p-4 rounded-2xl border min-h-[140px] transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer ${week.type === 'ca' ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800/30' : week.type === 'exam' ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800/30' : week.type === 'revision' ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800/30' : 'bg-gray-50 border-gray-100 dark:bg-gray-700/30 dark:border-gray-700'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-sm font-black ${week.type === 'ca' ? 'text-orange-600 dark:text-orange-400' : week.type === 'exam' ? 'text-red-600 dark:text-red-400' : week.type === 'revision' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>WK {week.weekNum}</span>
                                                <button onClick={() => setShowEventModal(true)} className="text-gray-400 hover:text-orange-500 transition-colors opacity-0 group-hover:opacity-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                            </div>
                                            <div>
                                                <h4 className={`font-bold text-sm leading-tight ${week.type !== 'learning' ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{week.title}</h4>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'Promotions' && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
                                {!showPromotionList ? (
                                    <div className="max-w-3xl mx-auto">
                                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">End of Session Promotion</h3>
                                        <p className="text-gray-500 dark:text-gray-400 mb-8">Securely migrate students to their next academic class while archiving their historical results.</p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative">
                                            <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-4">Migrate From</p>
                                                <select className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white mb-4 outline-none focus:ring-2 focus:ring-orange-500">
                                                    <option>Session: 2023/2024</option>
                                                </select>
                                                <select className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-500">
                                                    <option>Class: JSS 1</option>
                                                </select>
                                            </div>

                                            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-orange-500 rounded-full items-center justify-center text-white border-4 border-white dark:border-gray-800 z-10 shadow-sm">
                                                &rarr;
                                            </div>

                                            <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                                                <p className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase mb-4">Promote To</p>
                                                <select className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white mb-4 outline-none focus:ring-2 focus:ring-orange-500">
                                                    <option>Session: 2024/2025</option>
                                                </select>
                                                <select className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-500">
                                                    <option>Class: JSS 2</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-4 mb-8">
                                            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                                                <span className="font-semibold text-gray-700 dark:text-gray-300">Minimum Average Pass Mark (%)</span>
                                                <input type="number" defaultValue="50" min="0" max="100" className="w-24 px-3 py-2 text-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 font-bold outline-none focus:ring-2 focus:ring-orange-500" />
                                            </div>
                                            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                                                <span className="font-semibold text-gray-700 dark:text-gray-300">Archive Previous Term Records</span>
                                                <input type="checkbox" defaultChecked className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500" />
                                            </div>
                                        </div>

                                        <button onClick={() => { setShowPromotionList(true); toast.success('Promotion list generated! Awaiting your final review.'); }} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl font-black text-lg transition-all shadow-md hover:shadow-lg">Generate & Review Promotion List</button>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex justify-between items-center mb-6">
                                            <div>
                                                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Promotion Candidates Review</h3>
                                                <p className="text-gray-500 dark:text-gray-400">JSS 1 &rarr; JSS 2 (2024/2025)</p>
                                            </div>
                                            <div className="flex space-x-3">
                                                <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg font-bold">115 to Promote</div>
                                                <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg font-bold">5 to Repeat</div>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto border border-gray-100 dark:border-gray-700 rounded-xl mb-6">
                                            <table className="w-full text-left">
                                                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm">
                                                    <tr>
                                                        <th className="p-4 font-semibold">Admission No</th>
                                                        <th className="p-4 font-semibold">Student Name</th>
                                                        <th className="p-4 font-semibold">Current Class</th>
                                                        <th className="p-4 font-semibold">Suggested Class</th>
                                                        <th className="p-4 font-semibold">Eligibility Status</th>
                                                        <th className="p-4 font-semibold">Override</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                                                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                        <td className="p-4 font-bold">ADM-24-001</td>
                                                        <td className="p-4">Alex Johnson</td>
                                                        <td className="p-4">JSS 1</td>
                                                        <td className="p-4 text-orange-600 dark:text-orange-400 font-bold">JSS 2</td>
                                                        <td className="p-4"><span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">PROMOTE</span></td>
                                                        <td className="p-4"><select className="bg-gray-100 dark:bg-gray-700 text-sm rounded px-2 py-1 outline-none"><option>Promote</option><option>Repeat</option></select></td>
                                                    </tr>
                                                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors bg-red-50/30 dark:bg-red-900/10">
                                                        <td className="p-4 font-bold">ADM-24-042</td>
                                                        <td className="p-4">Michael Smith</td>
                                                        <td className="p-4">JSS 1</td>
                                                        <td className="p-4 text-gray-400 font-bold">JSS 1</td>
                                                        <td className="p-4"><span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">REPEAT</span></td>
                                                        <td className="p-4"><select defaultValue="Repeat" className="bg-gray-100 dark:bg-gray-700 text-sm rounded px-2 py-1 outline-none"><option>Promote</option><option value="Repeat">Repeat</option></select></td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="flex space-x-4">
                                            <button onClick={() => setShowPromotionList(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-3.5 rounded-xl font-bold transition-colors">Cancel</button>
                                            <button onClick={handleExecutePromotion} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3.5 rounded-xl font-bold transition-colors shadow-md">Execute Bulk Promotion</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                    </motion.div>
                </main>
            </div>

            {/* Session Creation Modal */}
            <AnimatePresence>
                {showSessionModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-700"
                        >
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Create Academic Session</h3>
                            <form onSubmit={handleCreateSession} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Session Year</label>
                                    <input name="sessionYear" type="text" required placeholder="e.g. 2025/2026" pattern="\d{4}/\d{4}" maxLength={9} title="Format: YYYY/YYYY" className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-shadow font-semibold" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">Terms Included</label>
                                    <div className="flex space-x-6 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                                        <label className="flex items-center space-x-2 text-gray-800 dark:text-gray-200 cursor-pointer font-semibold"><input type="checkbox" defaultChecked className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500" /> <span>1st Term</span></label>
                                        <label className="flex items-center space-x-2 text-gray-800 dark:text-gray-200 cursor-pointer font-semibold"><input type="checkbox" defaultChecked className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500" /> <span>2nd Term</span></label>
                                        <label className="flex items-center space-x-2 text-gray-800 dark:text-gray-200 cursor-pointer font-semibold"><input type="checkbox" defaultChecked className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500" /> <span>3rd Term</span></label>
                                    </div>
                                </div>
                                <div className="pt-4 flex space-x-4">
                                    <button type="button" onClick={() => setShowSessionModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-3.5 rounded-xl font-bold transition-colors">Cancel</button>
                                    <button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3.5 rounded-xl font-bold transition-colors shadow-md">Save Session</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Class Modal */}
            <AnimatePresence>
                {showClassModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-700">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Create New Class</h3>
                            <form onSubmit={handleCreateClass} className="space-y-4">
                                <input type="text" placeholder="Class Name (e.g. JSS 1A)" value={classFormData.name} onChange={(e) => setClassFormData({ ...classFormData, name: e.target.value })} maxLength={50} required className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" placeholder="Grade (e.g. 7)" value={classFormData.grade} onChange={(e) => setClassFormData({ ...classFormData, grade: e.target.value })} maxLength={20} required className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                    <input type="text" placeholder="Section (e.g. A)" value={classFormData.section} onChange={(e) => setClassFormData({ ...classFormData, section: e.target.value })} maxLength={10} required className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                </div>
                                <input type="number" placeholder="Capacity" value={classFormData.capacity} onChange={(e) => setClassFormData({ ...classFormData, capacity: parseInt(e.target.value) })} min="1" max="200" required className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                <select required value={classFormData.teacherId} onChange={(e) => setClassFormData({ ...classFormData, teacherId: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none">
                                    <option value="" disabled>Assign Form Master...</option>
                                    <option value="1">Sarah Jenkins (Mathematics)</option>
                                    <option value="2">Mark Davis (English)</option>
                                    <option value="3">Dr. Albert Einstein (Physics)</option>
                                    <option value="4">Mrs. Marie Curie (Chemistry)</option>
                                    <option value="5">Mr. John Doe (Biology)</option>
                                </select>
                                <div className="flex space-x-4 pt-4">
                                    <button type="button" onClick={() => setShowClassModal(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-3 rounded-xl font-bold transition-colors">Cancel</button>
                                    <button type="submit" disabled={isCreatingClass} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-70">
                                        {isCreatingClass ? 'Creating...' : 'Save Class'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Subject Modal */}
            <AnimatePresence>
                {showSubjectModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-700">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Add New Subject</h3>
                            <form onSubmit={handleCreateSubject} className="space-y-4">
                                <input name="name" type="text" required placeholder="Subject Name" maxLength={100} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                <select name="assignedClass" required defaultValue="" className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none">
                                    <option value="" disabled>Assign to Class...</option>
                                    <optgroup label="Primary">
                                        <option value="PRI1">Primary 1</option><option value="PRI2">Primary 2</option><option value="PRI3">Primary 3</option>
                                        <option value="PRI4">Primary 4</option><option value="PRI5">Primary 5</option><option value="PRI6">Primary 6</option>
                                    </optgroup>
                                    <optgroup label="Secondary">
                                        <option value="JSS1">JSS 1</option><option value="JSS2">JSS 2</option><option value="JSS3">JSS 3</option>
                                        <option value="SS1">SS 1</option><option value="SS2">SS 2</option><option value="SS3">SS 3</option>
                                    </optgroup>
                                </select>
                                <select name="teacherId" required defaultValue="" className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none">
                                    <option value="" disabled>Assign Teacher...</option>
                                    {staffList.filter((staff: any) => String(staff.role || '').toUpperCase().includes('TEACHER')).map((staff: any) => (
                                        <option key={staff.uid || staff.id} value={staff.uid || staff.id}>{staff.firstName} {staff.lastName}</option>
                                    ))}
                                </select>
                                <div className="flex space-x-4 pt-4">
                                    <button type="button" onClick={() => setShowSubjectModal(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-3 rounded-xl font-bold transition-colors">Cancel</button>
                                    <button type="submit" disabled={isCreatingSubject} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-70">{isCreatingSubject ? 'Saving...' : 'Save Subject'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modify Allocation Modal */}
            <AnimatePresence>
                {showAllocationModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-700">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Modify Allocation</h3>
                            <form onSubmit={handleUpdateAllocation} className="space-y-4">
                                <select name="teacherId" required defaultValue="" className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none">
                                    <option value="" disabled>Select Teacher...</option>
                                    {staffList.filter((staff: any) => String(staff.role || '').toUpperCase().includes('TEACHER')).map((staff: any) => (
                                        <option key={staff.uid || staff.id} value={staff.uid || staff.id}>{staff.firstName} {staff.lastName}</option>
                                    ))}
                                </select>
                                <input name="subjects" type="text" required placeholder="Subjects (e.g. Math, Physics)" maxLength={200} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                <input name="classes" type="text" required placeholder="Classes (e.g. JSS 1, SS 2)" maxLength={200} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                <div className="flex space-x-4 pt-4">
                                    <button type="button" onClick={() => setShowAllocationModal(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-3 rounded-xl font-bold transition-colors">Cancel</button>
                                    <button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-colors">Update Allocation</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Event Modal */}
            <AnimatePresence>
                {showEventModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-700">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Add Calendar Event</h3>
                            <form onSubmit={handleAddEvent} className="space-y-4">
                                <input name="title" type="text" required placeholder="Event Title" maxLength={100} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                <input name="date" type="date" required className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                <div className="flex space-x-4 pt-4">
                                    <button type="button" onClick={() => setShowEventModal(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-3 rounded-xl font-bold transition-colors">Cancel</button>
                                    <button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-colors">Add Event</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
