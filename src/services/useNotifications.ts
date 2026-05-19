import { useEffect, useMemo, useState } from 'react';
import { equalTo, off, onValue, orderByChild, query, ref, set } from 'firebase/database';
import { rtdb } from './firebase';
import { pushReply } from './realtime';
import { useAuth } from '../context/AuthContext';
import { schoolPath } from './schoolPaths';

export type LiveReply = { id: string; author: string; avatar: string; text: string; timestamp: string };
export type LiveNotification = {
    id: string;
    type: 'DIRECT' | 'BROADCAST' | 'general' | 'private';
    author: string;
    role: string;
    avatar: string;
    content: string;
    timestamp: string;
    isRead: boolean;
    likes: number;
    userLiked: boolean;
    participants?: string[] | Record<string, boolean>;
    userId?: string;
    conversationId?: string;
    replies: LiveReply[];
};

export const useLiveNotifications = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<LiveNotification[]>([]);
    const [replies, setReplies] = useState<Record<string, LiveReply[]>>({});

    useEffect(() => {
        if (!user?.schoolId) {
            setNotifications([]);
            return;
        }
        const role = String(user.role || '').toUpperCase();
        const canReadAll = ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'ACCOUNTANT'].includes(role);
        const notificationSources = canReadAll
            ? [ref(rtdb, schoolPath(user.schoolId, 'notifications'))]
            : [
                query(ref(rtdb, schoolPath(user.schoolId, 'notifications')), orderByChild(`participants/${user.id}`), equalTo(true)),
                query(ref(rtdb, schoolPath(user.schoolId, 'notifications')), orderByChild('userId'), equalTo(user.id)),
            ];
        const sourceRows: Record<number, LiveNotification[]> = {};
        notificationSources.forEach((notificationsRef, index) => onValue(notificationsRef, (snapshot) => {
            const value = snapshot.val() || {};
            sourceRows[index] = Object.entries(value).map(([id, raw]) => {
                const data = raw as any;
                const replies = Object.entries(data.replies || {}).map(([replyId, reply]) => ({
                    id: replyId,
                    author: (reply as any).author || 'User',
                    avatar: (reply as any).avatar || 'U',
                    text: (reply as any).text || '',
                    timestamp: (reply as any).timestamp || '',
                }));
                return {
                    id,
                    type: data.type || 'general',
                    author: data.author || data.createdByName || 'School',
                    role: data.role || 'Admin',
                    avatar: data.avatar || 'SM',
                    content: data.content || data.message || '',
                    timestamp: data.timestamp || data.createdAt || '',
                    isRead: Boolean(data.readBy?.[user?.id || ''] || (data.userId === user?.id && data.read)),
                    likes: data.likes || 0,
                    userLiked: Boolean(data.likedBy?.[user?.id || '']),
                    participants: data.participants || [],
                    userId: data.userId || '',
                    conversationId: data.conversationId || '',
                    replies,
                };
            }).reverse();
            const merged = Array.from(new Map(Object.values(sourceRows).flat().map((notification) => [notification.id, notification])).values())
                .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
            setNotifications(merged);
        }));
        return () => notificationSources.forEach((notificationsRef) => off(notificationsRef));
    }, [user?.id, user?.schoolId]);

    const feed = useMemo(() => notifications
        .filter((notification: any) => {
            const participants = notification.participants || {};
            const isParticipant = Array.isArray(participants)
                ? participants.includes(user?.id || '')
                : Boolean(participants[user?.id || '']);
            const role = String(user?.role || '').toUpperCase();
            if (notification.type === 'general' || notification.type === 'BROADCAST') return true;
            if (notification.userId === user?.id) return true;
            if (isParticipant) return true;
            if (notification.audience === 'ALL') return true;
            if (notification.audience === 'ALL_PARENTS' && role === 'PARENT') return true;
            if (notification.audience === 'ALL_STAFF' && ['ADMIN', 'PRINCIPAL', 'TEACHER', 'ACCOUNTANT'].includes(role)) return true;
            return false;
        })
        .map((notification) => ({ ...notification, replies: notification.replies || replies[notification.id] || [] })), [notifications, replies, user?.id, user?.role]);

    const markAsRead = async (id: string) => {
        if (!user?.id || !user.schoolId) return;
        await set(ref(rtdb, `${schoolPath(user.schoolId, 'notifications')}/${id}/readBy/${user.id}`), true);
        await set(ref(rtdb, `${schoolPath(user.schoolId, 'notifications')}/${id}/read`), true);
    };

    const toggleLike = async (notification: LiveNotification) => {
        if (!user?.id || !user.schoolId) return;
        await set(ref(rtdb, `${schoolPath(user.schoolId, 'notifications')}/${notification.id}/likes`), notification.userLiked ? Math.max(0, notification.likes - 1) : notification.likes + 1);
        await set(ref(rtdb, `${schoolPath(user.schoolId, 'notifications')}/${notification.id}/likedBy/${user.id}`), !notification.userLiked);
    };

    const reply = async (notificationId: string, text: string, avatar: string) => {
        if (!user?.schoolId) return;
        await pushReply(user.schoolId, notificationId, {
            author: user?.firstName || user?.email || 'User',
            avatar,
            text,
            timestamp: 'Just now',
            uid: user?.id,
        });
    };

    return { feed, markAsRead, toggleLike, reply };
};
