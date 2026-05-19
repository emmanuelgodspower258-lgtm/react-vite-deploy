import { get, ref, update } from 'firebase/database';
import { useCollection, useCreateMutation, useUpdateMutation } from './services/firestoreHooks';
import { auth, rtdb } from './services/firebase';
import { useAuth } from './context/AuthContext';
import { schoolPath } from './services/schoolPaths';

export const useGetTicketsQuery = (_?: unknown) => useCollection('tickets');

export const useCreateTicketMutation = () => {
    const [createTicket, state] = useCreateMutation('tickets');
    const mutate = (payload: any) => createTicket({
        ...payload,
        status: 'OPEN',
        createdBy: auth.currentUser?.uid || '',
        messages: [],
    });
    return [mutate, state] as const;
};

export const useUpdateTicketStatusMutation = () => {
    const [updateTicket, state] = useUpdateMutation('tickets');
    const mutate = ({ ticketId, status }: { ticketId: string; status: string }) => updateTicket({ id: ticketId, status });
    return [mutate, state] as const;
};

export const useAddMessageMutation = () => {
    const { user } = useAuth();
    const mutate = ({ ticketId, content }: { ticketId: string; content: string }) => ({
        unwrap: async () => {
            const currentUser = auth.currentUser;
            if (!user?.schoolId) throw new Error('A schoolId is required.');
            const ticketRef = ref(rtdb, `${schoolPath(user.schoolId, 'tickets')}/${ticketId}`);
            const snapshot = await get(ticketRef);
            const ticket = snapshot.val() || {};
            const message = {
                id: crypto.randomUUID(),
                content,
                senderId: currentUser?.uid || '',
                senderName: currentUser?.email || 'User',
                senderRole: '',
                status: 'sent',
                read: false,
                createdAt: new Date().toISOString(),
            };
            await update(ticketRef, {
                messages: [...(ticket.messages || []), message],
                updatedAt: new Date().toISOString(),
            });
            return message;
        },
    });

    return [mutate, { isLoading: false }] as const;
};
