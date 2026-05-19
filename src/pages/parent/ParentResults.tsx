import React from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useGetStudentsQuery } from '../../studentsApi';
import { useGetReportCardsQuery } from '../../reportCardsApi';

export const ParentResults = () => {
    const { user } = useAuth();
    const { data: students = [] } = useGetStudentsQuery();
    const { data: reports = [] } = useGetReportCardsQuery();
    const child = students.find((student: any) => student.admissionNumber === user?.studentAdmissionNumber || student.parentUid === user?.id);
    const rows = reports.flatMap((report: any) => Object.entries(report.scores || {}).filter(([studentId]) => studentId === child?.id).map(([studentId, score]) => ({ ...report, studentId, score: Number(score) })));
    const average = rows.length ? Math.round(rows.reduce((sum: number, row: any) => sum + row.score, 0) / rows.length) : 0;
    const getGrade = (total: number) => total >= 70 ? 'A' : total >= 60 ? 'B' : total >= 50 ? 'C' : total >= 40 ? 'D' : 'F';
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white">Academic Results</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Viewing live report data</p>
                </div>
                <button onClick={() => toast.success('Report Card downloading as PDF...')} className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all">
                    Download PDF
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Overall Average</h3>
                    <p className="text-4xl font-black text-blue-500">{average}%</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Class Position</h3>
                    <p className="text-4xl font-black text-orange-500">{rows.length}</p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mt-6">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700"><h2 className="text-lg font-bold text-gray-800 dark:text-white">Subject Breakdown</h2></div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm">
                            <tr><th className="p-4 font-semibold">Subject</th><th className="p-4 font-semibold text-center">1st CA</th><th className="p-4 font-semibold text-center">2nd CA</th><th className="p-4 font-semibold text-center">Exam</th><th className="p-4 font-semibold text-center">Total</th><th className="p-4 font-semibold text-center">Grade</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                            {rows.length === 0 ? <tr><td colSpan={6} className="p-4 text-center text-gray-500 font-semibold">No result records found.</td></tr> : rows.map((row: any) => (
                                <tr key={`${row.id}-${row.studentId}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="p-4 font-bold">{row.subjectId || row.subject}</td>
                                    <td className="p-4 text-center">{row.assessmentType?.includes('1st') ? row.score : ''}</td><td className="p-4 text-center">{row.assessmentType?.includes('2nd') ? row.score : ''}</td><td className="p-4 text-center">{row.assessmentType?.includes('Exam') ? row.score : ''}</td>
                                    <td className="p-4 text-center font-black text-blue-500">{row.score}</td>
                                    <td className="p-4 text-center font-black text-green-500">{getGrade(row.score)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
};
