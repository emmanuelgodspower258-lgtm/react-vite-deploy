import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { toast } from 'react-hot-toast';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { storage } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { useSchoolValue, useSetSchoolValue } from '../services/firestoreHooks';

const defaultScale = [
    { grade: 'A', min: 70, max: 100, remark: 'Excellent' },
    { grade: 'B', min: 60, max: 69, remark: 'Very Good' },
    { grade: 'C', min: 50, max: 59, remark: 'Credit' },
    { grade: 'D', min: 45, max: 49, remark: 'Pass' },
    { grade: 'F', min: 0, max: 44, remark: 'Fail' },
];

export const SchoolSettings = () => {
    const [isOpen, setIsOpen] = useState(true);
    const { user } = useAuth();
    const { data: settings } = useSchoolValue<any>('settings');
    const [saveSettings, { isLoading: isSaving }] = useSetSchoolValue('settings');
    const [profile, setProfile] = useState({ name: '', email: '', phone: '', address: '', logoUrl: '', currentSession: '', currentTerm: '' });
    const [gradingScale, setGradingScale] = useState(defaultScale);

    useEffect(() => {
        if (!settings) return;
        setProfile({
            name: settings.name || settings.schoolName || '',
            email: settings.email || '',
            phone: settings.phone || '',
            address: settings.address || '',
            logoUrl: settings.logoUrl || '',
            currentSession: settings.currentSession || '',
            currentTerm: settings.currentTerm || '',
        });
        if (Array.isArray(settings.gradingScale) && settings.gradingScale.length) setGradingScale(settings.gradingScale);
    }, [settings]);

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user?.schoolId) return;
        try {
            const logoRef = storageRef(storage, `schools/${user.schoolId}/settings/logo-${Date.now()}-${file.name}`);
            await uploadBytes(logoRef, file);
            const logoUrl = await getDownloadURL(logoRef);
            setProfile((prev) => ({ ...prev, logoUrl }));
            await saveSettings({ ...profile, logoUrl, gradingScale }).unwrap();
            toast.success('School logo uploaded.');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to upload logo.');
        }
    };

    const persistSettings = async () => {
        try {
            await saveSettings({ ...profile, gradingScale }).unwrap();
            toast.success('School settings saved.');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to save settings.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
            {isOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setIsOpen(false)} />}
            <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

            <div className={`transition-all duration-500 ${isOpen ? 'lg:ml-64' : 'ml-0'} flex flex-col min-h-screen`}>
                <Navbar toggleSidebar={() => setIsOpen(!isOpen)} userRole="School Administrator" />

                <main className="flex-1 p-6 lg:p-8">
                    <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white mb-2">School Settings</h1>
                    <p className="text-gray-500 mb-8">Configure global system defaults, grading scales, and general information.</p>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* General Settings */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-xl text-gray-800 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-700 pb-3">General Information</h3>
                            <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); persistSettings(); }}>
                                <div className="flex items-center space-x-4 mb-6">
                                    <div className="relative w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 cursor-pointer hover:border-orange-500 transition-colors overflow-hidden">
                                        {profile.logoUrl ? <img src={profile.logoUrl} alt="School logo" className="w-full h-full object-cover" /> : <span className="text-2xl">📷</span>}
                                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 dark:text-white">School Logo</p>
                                        <p className="text-xs text-gray-500">Recommended size: 250x250px</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">School Name</label>
                                    <input type="text" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} maxLength={100} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none font-bold" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Contact Email</label>
                                        <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Contact Phone</label>
                                        <input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Physical Address</label>
                                    <input type="text" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" placeholder="Current Session" value={profile.currentSession} onChange={(e) => setProfile({ ...profile, currentSession: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                    <input type="text" placeholder="Current Term" value={profile.currentTerm} onChange={(e) => setProfile({ ...profile, currentTerm: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                                </div>
                                <button type="submit" disabled={isSaving} className="mt-4 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold shadow-sm transition-colors disabled:opacity-70">{isSaving ? 'Saving...' : 'Update Profile'}</button>
                            </form>
                        </div>

                        {/* Grading Scale */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-xl text-gray-800 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-700 pb-3">Global Grading Scale</h3>
                            <p className="text-sm text-gray-500 mb-4">Define the percentage bounds for Report Card grades.</p>
                            <div className="space-y-3">
                                {gradingScale.map((g, index) => (
                                    <div key={g.grade} className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center font-black text-xl text-gray-800 dark:text-white">{g.grade}</div>
                                        <div className="flex-1 flex items-center space-x-2">
                                            <input type="number" value={g.min} onChange={(e) => setGradingScale((prev) => prev.map((item, i) => i === index ? { ...item, min: Number(e.target.value) } : item))} className="w-20 px-3 py-2 rounded-lg border border-gray-300 dark:bg-gray-700 dark:border-gray-600 text-center font-bold" />
                                            <span className="text-gray-400 font-bold">-</span>
                                            <input type="number" value={g.max} onChange={(e) => setGradingScale((prev) => prev.map((item, i) => i === index ? { ...item, max: Number(e.target.value) } : item))} className="w-20 px-3 py-2 rounded-lg border border-gray-300 dark:bg-gray-700 dark:border-gray-600 text-center font-bold" />
                                        </div>
                                        <input type="text" value={g.remark} onChange={(e) => setGradingScale((prev) => prev.map((item, i) => i === index ? { ...item, remark: e.target.value } : item))} className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:bg-gray-700 dark:border-gray-600 font-medium" />
                                        <button type="button" onClick={() => setGradingScale((prev) => prev.filter((_, i) => i !== index))} className="text-red-500 font-bold px-2 hover:underline">X</button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <button type="button" onClick={() => setGradingScale((prev) => [...prev, { grade: '', min: 0, max: 0, remark: '' }])} className="text-orange-500 font-bold hover:underline">+ Add Grade Bound</button>
                                <button type="button" onClick={persistSettings} disabled={isSaving} className="bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 px-6 py-2.5 rounded-xl font-bold shadow-sm transition-colors disabled:opacity-70">Save Scale</button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};
