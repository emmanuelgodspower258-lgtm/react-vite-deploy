import { useEffect, useMemo, useState } from 'react';
import { equalTo, get, off, onValue, orderByChild, push, query, ref, set, update } from 'firebase/database';
import { rtdb } from './firebase';
import { useAuth } from '../context/AuthContext';
import { normalizeClassName, schoolPath } from './schoolPaths';
import { searchUsersAndClasses } from './searchService';

export type ConversationType = 'direct' | 'category';
export type ChatCategoryTarget = 'parents' | 'staff' | 'teachers';
export type ChatSection = 'primary' | 'secondary';

export type ChatCategory = {
    target: ChatCategoryTarget;
    classId?: string;
    section?: ChatSection;
};

export type ChatConversation = {
    id: string;
    type: ConversationType;
    title: string;
    participants?: string[];
    participantMap: Record<string, boolean>;
    participantNames: Record<string, string>;
    category?: ChatCategory;
    createdBy: string;
    createdAt: string;
    schoolId: string;
    lastMessage?: string;
    lastTimestamp?: string;
    unreadBy?: Record<string, boolean>;
};

export type ChatMessage = {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    message: string;
    timestamp: string;
    readBy: string[];
    readByMap: Record<string, boolean>;
};

type CurrentUser = {
    id: string;
    uid?: string;
    role?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    schoolId?: string;
    assignedClass?: string;
    classId?: string;
};

const userId = (user: any) => user?.id || user?.uid || '';
const userName = (user: any) => `${user?.firstName || user?.name?.split(' ')[0] || ''} ${user?.lastName || user?.name?.split(' ').slice(1).join(' ') || ''}`.trim() || user?.name || user?.email || 'User';
const roleName = (user: any) => String(user?.role || '').toUpperCase();
const isAdminRole = (role?: string) => ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'ACCOUNTANT'].includes(String(role || '').toUpperCase());
const isTeacherRole = (role?: string) => String(role || '').toUpperCase().includes('TEACHER');
const isParentRole = (role?: string) => ['PARENT', 'PARENTS', 'GUARDIAN', 'GUARDIANS'].includes(String(role || '').toUpperCase());
const isStaffRole = (role?: string) => ['ADMIN', 'PRINCIPAL', 'ACCOUNTANT', 'STAFF'].includes(String(role || '').toUpperCase()) || isTeacherRole(role);
const isPrimaryClass = (classId: unknown) => normalizeClassName(classId).startsWith('PRI');
const isSecondaryClass = (classId: unknown) => normalizeClassName(classId).startsWith('JSS') || normalizeClassName(classId).startsWith('SS');
const safeKey = (value: string) => value.replace(/[.#$/[\]]/g, '_');
const conversationPath = (schoolId: string) => schoolPath(schoolId, 'conversations');
const messagesPath = (schoolId: string) => schoolPath(schoolId, 'messages');
const notificationsPath = (schoolId: string) => schoolPath(schoolId, 'notifications');

const getRows = async (schoolId: string, path: string) => {
    const snapshot = await get(ref(rtdb, schoolPath(schoolId, path)));
    return Object.entries(snapshot.val() || {}).map(([id, value]) => ({ id, ...(value as any) }));
};

const userClass = (user: any) => user.classId || user.studentClass || user.assignedClass || user.currentClass || '';

const categoryLabel = (category: ChatCategory) => {
    const target = category.target === 'parents' ? 'Parents' : category.target === 'teachers' ? 'Teachers' : 'Staff';
    if (category.classId) return `${target} - ${category.classId}`;
    if (category.section) return `${target} - ${category.section === 'primary' ? 'Primary Section' : 'Secondary Section'}`;
    return `All ${target}`;
};

const assertCanCreateCategory = (currentUser: CurrentUser, category: ChatCategory) => {
    const role = roleName(currentUser);
    if (isAdminRole(role)) return;
    if (isTeacherRole(role) && category.target === 'parents' && category.classId && normalizeClassName(category.classId) === normalizeClassName(currentUser.assignedClass || currentUser.classId)) return;
    throw new Error('Your role cannot create this conversation.');
};

const assertCanDirectMessage = (currentUser: CurrentUser, targetUser: any) => {
    const senderRole = roleName(currentUser);
    const targetRole = roleName(targetUser);
    if (isAdminRole(senderRole) && (isParentRole(targetRole) || isStaffRole(targetRole) || isTeacherRole(targetRole))) return;
    if (isTeacherRole(senderRole) && isParentRole(targetRole)) {
        const senderClass = currentUser.assignedClass || currentUser.classId;
        if (!senderClass || normalizeClassName(userClass(targetUser)) === normalizeClassName(senderClass)) return;
    }
    throw new Error('Your role cannot message this user.');
};

const resolveCategoryRecipients = async (schoolId: string, currentUser: CurrentUser, category: ChatCategory) => {
    assertCanCreateCategory(currentUser, category);
    const users = await getRows(schoolId, 'users');
    const students = category.target === 'parents' ? await getRows(schoolId, 'students') : [];
    const matchingStudents = students.filter((student) => {
        const cls = student.currentClass || student.classId;
        const matchesClass = category.classId ? normalizeClassName(cls) === normalizeClassName(category.classId) : true;
        const matchesSection = category.section === 'primary' ? isPrimaryClass(cls) : category.section === 'secondary' ? isSecondaryClass(cls) : true;
        return matchesClass && matchesSection;
    });
    const parentUids = new Set(matchingStudents.map((student) => String(student.parentUid || '').trim()).filter(Boolean));
    const admissions = new Set(matchingStudents.map((student) => String(student.admissionNumber || '').trim()).filter(Boolean));

    return users.filter((candidate) => {
        const role = roleName(candidate);
        if (candidate.id === currentUser.id || candidate.uid === currentUser.id) return false;
        if (category.target === 'staff') return isStaffRole(role);
        if (category.target === 'teachers') {
            if (!isTeacherRole(role)) return false;
            const cls = userClass(candidate);
            const matchesClass = category.classId ? normalizeClassName(cls) === normalizeClassName(category.classId) : true;
            const matchesSection = category.section === 'primary' ? isPrimaryClass(cls) : category.section === 'secondary' ? isSecondaryClass(cls) : true;
            return matchesClass && matchesSection;
        }
        if (!isParentRole(role)) return false;
        const cls = userClass(candidate);
        const directClassMatch = category.classId ? normalizeClassName(cls) === normalizeClassName(category.classId) : true;
        const sectionMatch = category.section === 'primary' ? isPrimaryClass(cls) : category.section === 'secondary' ? isSecondaryClass(cls) : true;
        const studentLinkMatch = parentUids.has(candidate.id || candidate.uid) || admissions.has(String(candidate.studentAdmissionNumber || candidate.admissionNumber || '').trim());
        if (category.classId || category.section) return (directClassMatch && sectionMatch) || studentLinkMatch;
        return true;
    });
};

export const createNotificationForRecipients = async (
    schoolId: string,
    recipients: any[],
    conversationId: string,
    text: string,
    sender: CurrentUser,
) => {
    const preview = text.length > 120 ? `${text.slice(0, 117)}...` : text;
    await Promise.all(recipients.map(async (recipient) => {
        const uid = userId(recipient);
        if (!uid || uid === sender.id) return;
        const notificationRef = push(ref(rtdb, notificationsPath(schoolId)));
        await set(notificationRef, {
            id: notificationRef.key,
            userId: uid,
            title: 'New Message',
            body: preview,
            content: preview,
            message: preview,
            conversationId,
            read: false,
            type: 'DIRECT',
            category: 'MESSAGE',
            author: userName(sender),
            role: sender.role || '',
            participants: { [uid]: true },
            readBy: {},
            likedBy: {},
            likes: 0,
            schoolId,
            timestamp: new Date().toISOString(),
        });
    }));
};

export const createDirectConversation = async (
    schoolId: string,
    currentUser: CurrentUser,
    targetUser: any,
) => {
    if (!schoolId || !currentUser?.id || !userId(targetUser)) throw new Error('A school user and target user are required.');
    assertCanDirectMessage(currentUser, targetUser);
    const participants = [currentUser.id, userId(targetUser)].sort();
    const conversationId = safeKey(`direct_${participants.join('_')}`);
    const existing = await get(ref(rtdb, `${conversationPath(schoolId)}/${conversationId}`));
    if (existing.exists()) return conversationId;
    const now = new Date().toISOString();
    await update(ref(rtdb, `${conversationPath(schoolId)}/${conversationId}`), {
        id: conversationId,
        type: 'direct',
        title: `${userName(currentUser)} / ${userName(targetUser)}`,
        participants,
        participantMap: { [currentUser.id]: true, [userId(targetUser)]: true },
        participantNames: { [currentUser.id]: userName(currentUser), [userId(targetUser)]: userName(targetUser) },
        createdBy: currentUser.id,
        createdAt: now,
        schoolId,
        lastMessage: '',
        lastTimestamp: '',
    });
    return conversationId;
};

export const createCategoryConversation = async (
    schoolId: string,
    currentUser: CurrentUser,
    category: ChatCategory,
    title?: string,
) => {
    if (!schoolId || !currentUser?.id) throw new Error('A school user is required.');
    const recipients = await resolveCategoryRecipients(schoolId, currentUser, category);
    if (recipients.length === 0) throw new Error('No real recipients matched this category.');
    const conversationRef = push(ref(rtdb, conversationPath(schoolId)));
    const conversationId = conversationRef.key || safeKey(`category_${Date.now()}`);
    const participantMap = {
        [currentUser.id]: true,
        ...Object.fromEntries(recipients.map((recipient) => [userId(recipient), true]).filter(([uid]) => Boolean(uid))),
    };
    const participantNames = {
        [currentUser.id]: userName(currentUser),
        ...Object.fromEntries(recipients.map((recipient) => [userId(recipient), userName(recipient)]).filter(([uid]) => Boolean(uid))),
    };
    await set(conversationRef, {
        id: conversationId,
        type: 'category',
        title: title || categoryLabel(category),
        category,
        participantMap,
        participantNames,
        createdBy: currentUser.id,
        createdAt: new Date().toISOString(),
        schoolId,
        lastMessage: '',
        lastTimestamp: '',
    });
    return conversationId;
};

export const sendMessage = async (
    schoolId: string,
    currentUser: CurrentUser,
    conversationId: string,
    text: string,
) => {
    if (!schoolId || !currentUser?.id || !conversationId || !text.trim()) return;
    const conversationSnapshot = await get(ref(rtdb, `${conversationPath(schoolId)}/${conversationId}`));
    const conversation = conversationSnapshot.val() as ChatConversation | null;
    if (!conversation?.participantMap?.[currentUser.id] && !isAdminRole(currentUser.role)) throw new Error('You are not a participant in this conversation.');
    const messageRef = push(ref(rtdb, `${messagesPath(schoolId)}/${conversationId}`));
    const timestamp = new Date().toISOString();
    const message: ChatMessage = {
        id: messageRef.key || crypto.randomUUID(),
        senderId: currentUser.id,
        senderName: userName(currentUser),
        text: text.trim(),
        message: text.trim(),
        timestamp,
        readBy: [currentUser.id],
        readByMap: { [currentUser.id]: true },
    };
    const participantIds = Object.keys(conversation?.participantMap || {}).filter(Boolean);
    const recipientIds = participantIds.filter((uid) => uid !== currentUser.id);
    const updates: Record<string, unknown> = {
        [`${messagesPath(schoolId)}/${conversationId}/${message.id}`]: message,
        [`${conversationPath(schoolId)}/${conversationId}/lastMessage`]: message.text,
        [`${conversationPath(schoolId)}/${conversationId}/lastTimestamp`]: timestamp,
        [`${conversationPath(schoolId)}/${conversationId}/unreadBy/${currentUser.id}`]: false,
    };
    recipientIds.forEach((uid) => {
        updates[`${conversationPath(schoolId)}/${conversationId}/unreadBy/${uid}`] = true;
    });
    await update(ref(rtdb), updates);
    await createNotificationForRecipients(
        schoolId,
        recipientIds.map((uid) => ({ id: uid, name: conversation?.participantNames?.[uid] || uid })),
        conversationId,
        message.text,
        currentUser,
    );
};

export const listenToConversations = (
    schoolId: string,
    currentUser: CurrentUser,
    callback: (conversations: ChatConversation[]) => void,
) => {
    if (!schoolId || !currentUser?.id) {
        callback([]);
        return () => undefined;
    }
    const source = query(ref(rtdb, conversationPath(schoolId)), orderByChild(`participantMap/${currentUser.id}`), equalTo(true));
    onValue(source, (snapshot) => {
        const conversations = Object.entries(snapshot.val() || {})
            .map(([id, value]) => ({ id, ...(value as any) } as ChatConversation))
            .sort((a, b) => String(b.lastTimestamp || b.createdAt || '').localeCompare(String(a.lastTimestamp || a.createdAt || '')));
        callback(conversations);
    });
    return () => off(source);
};

export const listenToMessages = (
    schoolId: string,
    conversationId: string,
    currentUser: CurrentUser,
    callback: (messages: ChatMessage[]) => void,
) => {
    if (!schoolId || !conversationId || !currentUser?.id) {
        callback([]);
        return () => undefined;
    }
    const source = ref(rtdb, `${messagesPath(schoolId)}/${conversationId}`);
    onValue(source, (snapshot) => {
        const messages = Object.entries(snapshot.val() || {})
            .map(([id, value]) => ({ id, ...(value as any) } as ChatMessage))
            .sort((a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || '')));
        callback(messages);
    });
    return () => off(source);
};

export const markConversationRead = async (
    schoolId: string,
    currentUser: CurrentUser,
    conversationId: string,
    messages: ChatMessage[] = [],
) => {
    if (!schoolId || !currentUser?.id || !conversationId) return;
    const updates: Record<string, unknown> = {
        [`${conversationPath(schoolId)}/${conversationId}/unreadBy/${currentUser.id}`]: false,
    };
    messages.forEach((message) => {
        updates[`${messagesPath(schoolId)}/${conversationId}/${message.id}/readByMap/${currentUser.id}`] = true;
        const nextReadBy = Array.from(new Set([...(message.readBy || []), currentUser.id]));
        updates[`${messagesPath(schoolId)}/${conversationId}/${message.id}/readBy`] = nextReadBy;
    });
    await update(ref(rtdb), updates);
};

export { searchUsersAndClasses };

export const useChatSystem = (activeConversationId = '') => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    useEffect(() => {
        if (!user?.id || !user.schoolId) {
            setConversations([]);
            return;
        }
        return listenToConversations(user.schoolId, user as CurrentUser, setConversations);
    }, [user?.id, user?.schoolId]);

    useEffect(() => {
        if (!user?.id || !user.schoolId || !activeConversationId) {
            setMessages([]);
            return;
        }
        return listenToMessages(user.schoolId, activeConversationId, user as CurrentUser, setMessages);
    }, [user?.id, user?.schoolId, activeConversationId]);

    const unreadCount = useMemo(() => conversations.filter((conversation) => conversation.unreadBy?.[user?.id || '']).length, [conversations, user?.id]);

    const startDirectConversation = async (targetUser: any) => {
        if (!user?.schoolId) throw new Error('A schoolId is required.');
        return createDirectConversation(user.schoolId, user as CurrentUser, targetUser);
    };

    const startCategoryConversation = async (category: ChatCategory, title?: string) => {
        if (!user?.schoolId) throw new Error('A schoolId is required.');
        return createCategoryConversation(user.schoolId, user as CurrentUser, category, title);
    };

    const sendConversationMessage = async (conversationId: string, text: string) => {
        if (!user?.schoolId) throw new Error('A schoolId is required.');
        return sendMessage(user.schoolId, user as CurrentUser, conversationId, text);
    };

    const markRead = async (conversationId: string) => {
        if (!user?.schoolId) return;
        return markConversationRead(user.schoolId, user as CurrentUser, conversationId, messages);
    };

    return {
        conversations,
        threads: conversations,
        messages,
        unreadCount,
        createDirectConversation: startDirectConversation,
        createCategoryConversation: startCategoryConversation,
        sendMessage: sendConversationMessage,
        markRead,
    };
};
