import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { auth, rtdb } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { toast } from 'react-hot-toast';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // 1. Create the user in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await set(ref(rtdb, `superAdmins/${user.uid}`), {
                uid: user.uid,
                name: fullName,
                email: email,
                role: 'SUPER_ADMIN',
                createdAt: new Date().toISOString()
            });

            toast.success('System Admin created successfully!');
            // 3. Send them to the dashboard!
            navigate('/'); 
        } catch (err: any) {
            console.error('Registration failed:', err);
            toast.error(err.message || 'Failed to register admin.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen flex items-center justify-center bg-orange-50 dark:bg-gray-900 px-4"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700">
                    <h2 className="text-3xl font-extrabold text-center text-orange-500 dark:text-orange-400 mb-2">
                        System Admin Setup
                    </h2>
                    <p className="text-center text-gray-500 dark:text-gray-400 mb-8 text-sm">
                        Create the master administrator account.
                    </p>

                    <div className="mb-5">
                        <label className="block text-gray-700 dark:text-gray-300 mb-2 font-semibold">Full Name</label>
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>

                    <div className="mb-5">
                        <label className="block text-gray-700 dark:text-gray-300 mb-2 font-semibold">Email Address</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-700 dark:text-gray-300 mb-2 font-semibold">Master Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex justify-center disabled:opacity-70"
                    >
                        {isLoading ? 'Creating...' : 'Create Admin Account'}
                    </motion.button>
                </form>
            </motion.div>
        </motion.div>
    );
}
