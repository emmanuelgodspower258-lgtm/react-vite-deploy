import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getUserProfile, normalizeRole } from '../services/schoolPaths';

const getRoleHome = (role?: string) => {
    // All roles land on the unified dashboard which handles internal role views
    return '/';
};

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const profile = await getUserProfile(userCredential.user.uid);
            const role = normalizeRole(profile.role);
            navigate(getRoleHome(role));
        } catch (err) {
            console.error('Failed to log in', err);
            setError('Invalid email or password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen flex items-center justify-center bg-orange-50 dark:bg-gray-900 transition-colors duration-500 px-4"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
                className="w-full max-w-md"
            >
                <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl transition-colors duration-500 border border-gray-100 dark:border-gray-700">
                    <motion.h2
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-3xl font-extrabold text-center text-orange-500 dark:text-orange-400 mb-8 tracking-tight"
                    >
                        SMS Portal
                    </motion.h2>

                    <div className="mb-5">
                        <label className="block text-gray-700 dark:text-gray-300 mb-2 font-semibold">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            maxLength={100}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent transition-all duration-300 shadow-sm"
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-700 dark:text-gray-300 mb-2 font-semibold">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            maxLength={100}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent transition-all duration-300 shadow-sm"
                        />
                    </div>

                    {error && <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-red-500 text-sm mb-4 font-medium">{error}</motion.p>}

                    <motion.button
                        whileHover={{ scale: 1.02, boxShadow: "0px 8px 15px rgba(249, 115, 22, 0.3)" }}
                        whileTap={{ scale: 0.95 }}
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all duration-300 flex justify-center mt-2"
                    >
                        {isLoading ? 'Authenticating...' : 'Secure Login'}
                    </motion.button>
                </form>
            </motion.div>
        </motion.div>
    );
};
