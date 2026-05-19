import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useGetStudentsQuery } from '../../studentsApi';
import { useSaveGradeMutation } from '../../reportsApi';
import { useAuth } from '../../context/AuthContext';
import { useGetSubjectsQuery } from '../../subjectsApi';

export const TeacherResults = () => {
    const { user } = useAuth();
    const { data: allStudents = [] } = useGetStudentsQuery();
    const { data: subjects = [] } = useGetSubjectsQuery();
    const [saveGrade, { isLoading }] = useSaveGradeMutation();
    const students = allStudents.filter((student: any) => student.classId === user?.assignedClass || student.currentClass === user?.assignedClass);
    const availableSubjects = subjects.length
        ? subjects.filter((subject: any) => subject.teacherId === user?.id || subject.teacherUid === user?.id || (user?.assignedSubjects || []).includes(subject.name) || (user?.assignedSubjects || []).includes(subject.id))
        : (user?.assignedSubjects || []).map((subject) => ({ id: subject, name: subject }));
    const [grades, setGrades] = useState<Record<string, { ca1: number; ca2: number; exam: number }>>({});

    const calculateTotal = (ca1: number, ca2: number, exam: number) => {
        return (Number(ca1) || 0) + (Number(ca2) || 0) + (Number(exam) || 0);
    };

    const getGrade = (total: number) => {
        if (total >= 70) return 'A';
        if (total >= 60) return 'B';
        if (total >= 50) return 'C';
        if (total >= 40) return 'D';
        return 'F';
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white">Grading & Results</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Input Continuous Assessment and Exam scores.</p>
                </div>
                <div className="flex space-x-3">
                    <select className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-orange-500"><option>{user?.assignedClass || 'No Class Assigned'}</option></select>
                    <select className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-orange-500">{availableSubjects.map((subject: any) => <option key={subject.id || subject.name} value={subject.name || subject.id}>{subject.name || subject.id}</option>)}</select>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Scores Entry</h2>
                    <button disabled={isLoading} onClick={async () => {
                        await saveGrade({
                            classId: user?.assignedClass,
                            subjectId: availableSubjects[0]?.name || availableSubjects[0]?.id || '',
                            term: '',
                            assessmentType: 'Report Card',
                            scores: Object.fromEntries(Object.entries(grades).map(([id, score]) => [id, calculateTotal(score.ca1, score.ca2, score.exam)])),
                            studentAdmissionNumbers: Object.fromEntries(students.map((student: any) => [student.id, student.admissionNumber || ''])),
                            studentNames: Object.fromEntries(students.map((student: any) => [student.id, `${student.firstName || ''} ${student.lastName || ''}`.trim()])),
                            teacherId: user?.id,
                            locked: true,
                            submittedBy: user?.id,
                        }, `${user?.assignedClass}_${availableSubjects[0]?.name || availableSubjects[0]?.id || 'subject'}_Report_Card`.replace(/[.#$/[\]\s]+/g, '_')).unwrap();
                        toast.success('Grades saved securely!');
                    }} className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all">Save to Database</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 text-sm">
                            <tr><th className="p-4 font-semibold">Student Name</th><th className="p-4 font-semibold text-center">1st CA (20)</th><th className="p-4 font-semibold text-center">2nd CA (20)</th><th className="p-4 font-semibold text-center">Exam (60)</th><th className="p-4 font-semibold text-center">Total</th><th className="p-4 font-semibold text-center">Grade</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                            {students.map((student: any) => {
                                const score = grades[student.id] || { ca1: 0, ca2: 0, exam: 0 };
                                return (
                                <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="p-4 font-bold text-gray-900 dark:text-white">{student.firstName} {student.lastName}</td>
                                    <td className="p-4 text-center"><input type="number" max="20" value={score.ca1} onChange={(e) => setGrades(prev => ({ ...prev, [student.id]: { ...score, ca1: Number(e.target.value) } }))} className="w-16 px-2 py-1 text-center border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-orange-500 font-bold" /></td>
                                    <td className="p-4 text-center"><input type="number" max="20" value={score.ca2} onChange={(e) => setGrades(prev => ({ ...prev, [student.id]: { ...score, ca2: Number(e.target.value) } }))} className="w-16 px-2 py-1 text-center border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-orange-500 font-bold" /></td>
                                    <td className="p-4 text-center"><input type="number" max="60" value={score.exam} onChange={(e) => setGrades(prev => ({ ...prev, [student.id]: { ...score, exam: Number(e.target.value) } }))} className="w-16 px-2 py-1 text-center border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-orange-500 font-bold" /></td>
                                    <td className="p-4 text-center font-black text-blue-600 dark:text-blue-400">{calculateTotal(score.ca1, score.ca2, score.exam)}</td>
                                    <td className="p-4 text-center font-black text-green-600 dark:text-green-400">{getGrade(calculateTotal(score.ca1, score.ca2, score.exam))}</td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
};
