import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useSaveGradeMutation } from '../reportsApi';
import { useGetStudentsQuery } from '../studentsApi';
import { useAuth } from '../context/AuthContext';
import { useGetSubjectsQuery } from '../subjectsApi';
import { useCollection, useCreateMutation } from '../services/firestoreHooks';
import { isParentRole, participantsFromUsers } from '../services/audience';

export const Grades = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('Input Grades');

    const assignedSubjects = user?.assignedSubjects || [];
    const [selectedClass, setSelectedClass] = useState(user?.assignedClass || '');
    const [selectedSubject, setSelectedSubject] = useState(assignedSubjects[0] || '');
    const [selectedTerm, setSelectedTerm] = useState('1st Term');
    const [assessmentType, setAssessmentType] = useState('1st Continuous Assessment');
    const [maxScore, setMaxScore] = useState(20);

    // ✅ FIXED TYPE HERE
    const [gradesState, setGradesState] = useState<Record<string | number, string>>({});
    const [isLocked, setIsLocked] = useState(false);

    const { data: students = [], isLoading: isLoadingStudents } = useGetStudentsQuery();
    const { data: subjects = [] } = useGetSubjectsQuery();
    const { data: users = [] } = useCollection('users');
    const [saveGrade, { isLoading: isSaving }] = useSaveGradeMutation();
    const [createNotification] = useCreateMutation('notifications');
    const availableSubjects = subjects.length
        ? subjects.filter((subject: any) => subject.teacherId === user?.id || subject.teacherUid === user?.id || assignedSubjects.includes(subject.name) || assignedSubjects.includes(subject.id))
        : assignedSubjects.map((subject) => ({ id: subject, name: subject }));

    // ✅ FILTER STUDENTS SAFELY
    let myClassStudents = students.filter((s: any) => s.classId === selectedClass || s.currentClass === selectedClass);

    useEffect(() => {
        if (!selectedClass && user?.assignedClass) setSelectedClass(user.assignedClass);
        if (!selectedSubject && availableSubjects.length > 0) setSelectedSubject(availableSubjects[0].name || availableSubjects[0].id);
    }, [user?.assignedClass, assignedSubjects.join('|'), availableSubjects.length, selectedClass, selectedSubject]);

    useEffect(() => {
        if (assessmentType.includes('Continuous Assessment') || assessmentType.includes('Test')) setMaxScore(20);
        else if (assessmentType.includes('Exam')) setMaxScore(60);
        else setMaxScore(100);

        setIsLocked(false);
        setGradesState({});
    }, [assessmentType, selectedClass, selectedSubject, selectedTerm]);

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 font-semibold text-sm">Loading Gradebook...</p>
                </div>
            </div>
        );
    }

    const handleScoreChange = (studentId: string | number, val: string) => {
        if (Number(val) > maxScore) {
            toast.error(`Maximum score allowed for this assessment is ${maxScore}.`, { id: 'max-score' });
            return;
        }
        if (Number(val) < 0) return;

        setGradesState(prev => ({ ...prev, [studentId]: val }));
    };

    const handleSaveGrades = async () => {
        if (isLocked) return;

        if (Object.keys(gradesState).length < myClassStudents.length && myClassStudents.length > 0) {
            toast.error('Please input grades for all students before submitting.');
            return;
        }

        try {
            await saveGrade({
                classId: selectedClass,
                subjectId: selectedSubject,
                term: selectedTerm,
                assessmentType,
                scores: Object.fromEntries(Object.entries(gradesState).map(([studentId, score]) => [studentId, Number(score)])),
                studentAdmissionNumbers: Object.fromEntries(myClassStudents.map((student: any) => [student.id, student.admissionNumber || ''])),
                studentNames: Object.fromEntries(myClassStudents.map((student: any) => [student.id, `${student.firstName || ''} ${student.lastName || ''}`.trim()])),
                teacherId: user?.id,
                submittedBy: user?.id,
                locked: true
            }, `${selectedClass}_${selectedSubject}_${selectedTerm}_${assessmentType}`.replace(/[.#$/[\]\s]+/g, '_')).unwrap();

            setIsLocked(true);
            toast.success('Grades locked and securely saved to database!');
            const parentRecipients = users.filter((account: any) => isParentRole(account.role) && myClassStudents.some((student: any) => student.parentUid === account.id || student.admissionNumber === account.studentAdmissionNumber));
            await createNotification({
                type: 'BROADCAST',
                audience: `${selectedClass}_PARENTS`,
                category: 'ACADEMIC',
                title: `New ${assessmentType} result`,
                content: `${assessmentType} scores for ${selectedSubject} have been submitted.`,
                message: `${assessmentType} scores for ${selectedSubject} have been submitted.`,
                author: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Teacher',
                role: user?.role || 'Teacher',
                avatar: 'GR',
                timestamp: new Date().toISOString(),
                participants: participantsFromUsers(parentRecipients),
                readBy: {},
                likedBy: {},
                likes: 0,
            }).unwrap();
            setTimeout(() => toast.success('New Result Notification pushed to Parents! 🔔', { icon: '📲' }), 800);
        } catch {
            toast.error('Failed to upload grades.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-500 font-sans">
            {isOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setIsOpen(false)} />}
            <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

            <div className={`transition-all duration-500 ${isOpen ? 'lg:ml-64' : 'ml-0'} flex flex-col min-h-screen`}>
                <Navbar toggleSidebar={() => setIsOpen(!isOpen)} userRole="Teacher" />

                <main className="flex-1 p-6 lg:p-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">
                            Academic Control Center
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Input grades strictly for your assigned subjects. Submitting locks the assessment.
                        </p>
                    </div>

                    {activeTab === 'Input Grades' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                <div className="flex justify-between items-center mt-6">
                                    <div className="flex items-center text-sm font-bold text-gray-600 dark:text-gray-300">
                                        Maximum Score:
                                        <span className="ml-2 bg-orange-100 text-orange-600 dark:bg-orange-900/30 px-3 py-1 rounded-lg text-lg font-black">
                                            {maxScore}
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleSaveGrades}
                                        disabled={isSaving || isLocked || !selectedClass || !selectedSubject}
                                        className="px-6 py-2.5 rounded-xl font-bold bg-orange-500 hover:bg-orange-600 text-white"
                                    >
                                        {isSaving ? 'Locking...' : isLocked ? 'Assessment Locked' : 'Submit & Lock Grades'}
                                    </button>
                                </div>
                            </div>

                            <table className="w-full text-left">
                                <thead>
                                    <tr>
                                        <th className="p-5 font-semibold">Student Name</th>
                                        <th className="p-5 font-semibold text-right">Score Entry</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoadingStudents ? (
                                        <tr>
                                            <td colSpan={2} className="p-8 text-center">
                                                Loading class roster...
                                            </td>
                                        </tr>
                                    ) : !selectedClass || !selectedSubject ? (
                                        <tr>
                                            <td colSpan={2} className="p-8 text-center">
                                                Your teacher profile has no assigned class or subject in the database.
                                            </td>
                                        </tr>
                                    ) : (
                                        myClassStudents.map((student: any) => {
                                            const studentId = student._id || student.id;

                                            return (
                                                <tr key={studentId}>
                                                    <td className="p-5">
                                                        {student.firstName} {student.lastName}
                                                    </td>
                                                    <td className="p-5 text-right">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={maxScore}
                                                            value={gradesState[studentId] || ''}
                                                            onChange={(e) =>
                                                                handleScoreChange(studentId, e.target.value)
                                                            }
                                                            disabled={isLocked || isSaving}
                                                            placeholder={`/ ${maxScore}`}
                                                            className="w-28 px-4 py-2 text-center border rounded-xl"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </motion.div>
                    )}
                </main>
            </div>
        </div>
    );
};
