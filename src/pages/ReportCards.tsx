import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { toast } from 'react-hot-toast';
import { useGetReportsQuery } from '../reportsApi';
import { usePublishReportCardMutation } from '../reportCardsApi';
import { useAuth } from '../context/AuthContext';

export const ReportCards = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('Grade Input');
    const tabs = ['Grade Input', 'Review & Publish', 'Analytics'];

    const { user } = useAuth();
    const { data: reportsList = [], isLoading } = useGetReportsQuery();
    const [publishReportCard, { isLoading: isPublishing }] = usePublishReportCardMutation();
    const getGrade = (total: number) => total >= 70 ? 'A' : total >= 60 ? 'B' : total >= 50 ? 'C' : total >= 40 ? 'D' : 'F';

    const publishReports = async () => {
        try {
            await Promise.all(reportsList.flatMap((report: any) => Object.entries(report.scores || {}).map(([studentId, score]) => publishReportCard({
                gradeRecordId: report.id,
                studentId,
                studentName: report.studentNames?.[studentId] || studentId,
                studentAdmissionNumber: report.studentAdmissionNumbers?.[studentId] || '',
                classId: report.classId || report.className || '',
                className: report.className || report.classId || '',
                subjectId: report.subjectId || report.subject || '',
                subject: report.subject || report.subjectId || '',
                term: report.term || '',
                assessmentType: report.assessmentType || '',
                score,
                scores: { [studentId]: score },
                published: true,
                publishedAt: new Date().toISOString(),
                publishedBy: user?.id || '',
            }, `${studentId}_${report.id}_published`.replace(/[.#$/[\]]/g, '_')).unwrap())));
            toast.success('Report cards published to parents.');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to publish report cards.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
            {isOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setIsOpen(false)} />}
            <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

            <div className={`transition-all duration-500 ${isOpen ? 'lg:ml-64' : 'ml-0'} flex flex-col min-h-screen`}>
                <Navbar toggleSidebar={() => setIsOpen(!isOpen)} userRole="School Administrator" />

                <main className="flex-1 p-6 lg:p-8">
                    <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white mb-2">Report Card Builder</h1>
                    <p className="text-gray-500 mb-6">Input grades, review automatic calculations, and publish to parents.</p>

                    <div className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                        {tabs.map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 px-4 font-semibold whitespace-nowrap transition-colors ${activeTab === tab ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>{tab}</button>
                        ))}
                    </div>

                    {activeTab === 'Grade Input' && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50 dark:bg-gray-800/50">
                                <div className="flex space-x-3 w-full md:w-auto">
                                    <select className="px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none shadow-sm font-bold">
                                        <optgroup label="Primary">
                                            <option>Primary 1</option><option>Primary 2</option><option>Primary 3</option><option>Primary 4</option><option>Primary 5</option><option>Primary 6</option>
                                        </optgroup>
                                        <optgroup label="Secondary">
                                            <option>JSS 1</option><option>JSS 2</option><option>JSS 3</option><option>SS 1</option><option>SS 2</option><option>SS 3</option>
                                        </optgroup>
                                    </select>
                                    <select className="px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none shadow-sm font-bold">
                                        <option>Mathematics</option>
                                        <option>English Language</option>
                                        <option>Basic Science</option>
                                        <option>Physics</option>
                                        <option>Chemistry</option>
                                        <option>Biology</option>
                                        <option>Economics</option>
                                        <option>Civic Education</option>
                                    </select>
                                </div>
                                <button onClick={() => toast.success('Report data refreshed from database.')} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all disabled:opacity-70">
                                    Refresh Grades
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm border-b border-gray-100 dark:border-gray-700">
                                        <tr><th className="p-4 font-semibold">Student Name</th><th className="p-4 font-semibold text-center">1st CA (20)</th><th className="p-4 font-semibold text-center">2nd CA (20)</th><th className="p-4 font-semibold text-center">Exam (60)</th><th className="p-4 font-semibold text-center">Total (100)</th><th className="p-4 font-semibold text-center">Grade</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                                        {isLoading ? (
                                            <tr><td colSpan={6} className="p-4 text-center font-semibold text-gray-500">Loading report data...</td></tr>
                                        ) : reportsList.length === 0 ? (
                                            <tr><td colSpan={6} className="p-4 text-center font-semibold text-gray-500">No grades have been entered yet.</td></tr>
                                        ) : reportsList.map((report: any) => {
                                            const scores = report.scores || {};
                                            const rows = Object.entries(scores);
                                            return rows.map(([studentId, score]: any) => {
                                                const total = Number(score || report.total || 0);
                                                return (
                                                    <tr key={`${report.id}-${studentId}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                        <td className="p-4 font-bold text-gray-900 dark:text-white">{report.studentNames?.[studentId] || studentId}</td>
                                                        <td className="p-4 text-center">{report.assessmentType?.includes('1st') ? total : ''}</td>
                                                        <td className="p-4 text-center">{report.assessmentType?.includes('2nd') ? total : ''}</td>
                                                        <td className="p-4 text-center">{report.assessmentType?.includes('Exam') ? total : ''}</td>
                                                        <td className="p-4 text-center font-black text-blue-600 dark:text-blue-400">{total}</td>
                                                        <td className="p-4 text-center font-black text-green-600 dark:text-green-400">{getGrade(total)}</td>
                                                    </tr>
                                                );
                                            });
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Review & Publish' && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Final Reports Review</h3>
                                <button onClick={publishReports} disabled={isPublishing || reportsList.length === 0} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all disabled:opacity-70">
                                    {isPublishing ? 'Publishing...' : 'Publish to Parents'}
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                {reportsList.length === 0 ? <p className="text-sm text-gray-500">No report cards are ready to publish.</p> : reportsList.map((report: any) => (
                                    <div key={report.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col md:flex-row items-center gap-4">
                                        <div className="flex-1">
                                            <h4 className="font-black text-lg text-gray-900 dark:text-white">{report.classId || report.className}</h4>
                                            <p className="text-sm text-gray-500 font-bold mt-1">{report.subjectId || report.subject} | {report.term}</p>
                                        </div>
                                        <div className="flex-1 w-full">
                                            <input type="text" placeholder="Add Admin/Principal Remark..." className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
                                        </div>
                                        <button className="text-orange-500 font-bold hover:underline whitespace-nowrap">Preview PDF</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'Analytics' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <h3 className="font-bold text-gray-800 dark:text-white mb-6">Subject Pass Rates (JSS 1)</h3>
                                <div className="space-y-4">
                                    <div><div className="flex justify-between text-sm font-bold text-gray-700 dark:text-gray-300 mb-1"><span>Mathematics</span><span>92% Passed</span></div><div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5"><div className="bg-green-500 h-2.5 rounded-full" style={{ width: '92%' }}></div></div></div>
                                    <div><div className="flex justify-between text-sm font-bold text-gray-700 dark:text-gray-300 mb-1"><span>English</span><span>85% Passed</span></div><div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5"><div className="bg-blue-500 h-2.5 rounded-full" style={{ width: '85%' }}></div></div></div>
                                    <div><div className="flex justify-between text-sm font-bold text-gray-700 dark:text-gray-300 mb-1"><span>Physics</span><span>60% Passed</span></div><div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5"><div className="bg-orange-500 h-2.5 rounded-full" style={{ width: '60%' }}></div></div></div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};
