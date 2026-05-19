import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { auth, rtdb } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { get, ref } from 'firebase/database';
import { getUserProfile, normalizeList, normalizeRole } from '../services/schoolPaths';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Firebase automatically listens for login/logout events across tabs
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const userData = await getUserProfile(firebaseUser.uid);
                    const role = normalizeRole(userData.role);
                    if (!role) throw new Error('User profile is missing a role.');
                    
                    let schoolName = userData.schoolName || '';
                    // Only attempt to fetch from the schools node if not present, and catch errors
                    if (!schoolName && userData.schoolId) {
                        try {
                            const schoolSnap = await get(ref(rtdb, `schools/${userData.schoolId}/settings/name`));
                            schoolName = schoolSnap.val() || '';
                        } catch (err) {
                            console.warn("Could not fetch school name (likely permission denied for this role):", err);
                        }
                    }

                    // Support both 'firstName/lastName' and combined 'name' field (common for parents)
                    const firstName = userData.firstName || userData.name?.split(' ')[0] || 'Unknown';
                    const lastName = userData.lastName || userData.name?.split(' ').slice(1).join(' ') || 'User';

                    setUser({
                        id: firebaseUser.uid,
                        email: firebaseUser.email || '',
                        role,
                        firstName,
                        lastName,
                        schoolId: userData.schoolId || '',
                        schoolName: schoolName || '',
                        classId: userData.classId || userData.studentClass || userData.assignedClass || '',
                        assignedClass: userData.assignedClass || normalizeList(userData.assignedClasses)[0] || '',
                        assignedSubjects: normalizeList(userData.assignedSubjects),
                        studentAdmissionNumber: userData.studentAdmissionNumber || '',
                        studentId: userData.studentId || '',
                        studentClass: userData.studentClass || '',
                    });
                } catch (error) {
                    console.error("Error fetching user data from Realtime Database:", error);
                    setUser(null);
                    await signOut(auth).catch((signOutError) => {
                        console.error('Failed to sign out after unresolved user profile:', signOutError);
                    });
                }
            } else {
                setUser(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        await signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
