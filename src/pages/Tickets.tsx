import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useGetTicketsQuery, useCreateTicketMutation, useUpdateTicketStatusMutation, useAddMessageMutation } from '../ticketsApi';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAuth } from '../context/AuthContext';

interface Ticket {
    id: string;
    title: string;
    description: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    category: string;
    createdBy: string;
    assignedTo?: string;
    createdAt: string;
    updatedAt: string;
    messages: TicketMessage[];
}

interface TicketMessage {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    createdAt: string;
}

export const Tickets = () => {
    const [isOpen, setIsOpen] = useState(true);
    const { user } = useAuth();
    const [userRole, setUserRole] = useState<string>('Loading...');
    const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
    const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'MEDIUM',
        category: 'General'
    });

    // API calls
    const { data: tickets = [], isLoading: isLoadingTickets } = useGetTicketsQuery(undefined);
    const [createTicket, { isLoading: isCreating }] = useCreateTicketMutation();
    const [updateTicketStatus, { isLoading: isUpdating }] = useUpdateTicketStatusMutation();
    const [addMessage, { isLoading: isAddingMessage }] = useAddMessageMutation();

    // Decode JWT token to get user role
    useEffect(() => {
        if (user?.role) {
            setUserRole(user.role.replace('_', ' ').replace(/\w\S*/g, (txt: string) =>
                txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()));
        }

        // Auto close sidebar on mobile
        const handleResize = () => {
            if (window.innerWidth < 1024) setIsOpen(false);
            else setIsOpen(true);
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, [user?.role]);

    const filteredTickets = tickets.filter((ticket: Ticket) => {
        const matchesStatus = selectedStatus === 'ALL' || ticket.status === selectedStatus;
        const matchesPriority = selectedPriority === 'ALL' || ticket.priority === selectedPriority;
        return matchesStatus && matchesPriority;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'RESOLVED': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'CLOSED': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'LOW': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'HIGH': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
            case 'URGENT': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'OPEN': return '🔴';
            case 'IN_PROGRESS': return '🟡';
            case 'RESOLVED': return '🟢';
            case 'CLOSED': return '⚫';
            default: return '⚪';
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'LOW': return '⬇️';
            case 'MEDIUM': return '➡️';
            case 'HIGH': return '⬆️';
            case 'URGENT': return '🚨';
            default: return '❓';
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedTicket) return;
        try {
            await addMessage({
                ticketId: selectedTicket.id,
                content: newMessage
            }).unwrap();
            setNewMessage('');
            toast.success('Message sent successfully!');
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to send message');
        }
    };

    // CRUD functions
    const handleCreate = async () => {
        try {
            await createTicket({
                title: formData.title,
                description: formData.description,
                priority: formData.priority as any,
                category: formData.category
            }).unwrap();
            setShowCreateModal(false);
            setFormData({
                title: '',
                description: '',
                priority: 'MEDIUM',
                category: 'General'
            });
            toast.success('Ticket created successfully!');
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to create ticket');
        }
    };

    const handleUpdateStatus = async (ticketId: string, status: string) => {
        try {
            await updateTicketStatus({
                ticketId,
                status: status as any
            }).unwrap();
            toast.success('Ticket status updated successfully!');
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to update ticket status');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50 dark:from-gray-900 dark:via-rose-900 dark:to-pink-900 transition-all duration-500">
            {/* Dark overlay for mobile */}
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
            <div className={`transition-all duration-500 ${isOpen ? 'lg:ml-64' : 'ml-0'} flex flex-col min-h-screen`}>
                <Navbar toggleSidebar={() => setIsOpen(!isOpen)} userRole={userRole} />

                <main className="flex-1 p-6 lg:p-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="max-w-7xl mx-auto"
                    >
                        {/* Header */}
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
                            <div className="mb-6 lg:mb-0">
                                <h1 className="text-4xl font-black text-gray-800 dark:text-white mb-2 tracking-tight">
                                    Support Tickets
                                </h1>
                                <p className="text-gray-600 dark:text-gray-300 text-lg">
                                    Manage and respond to support requests
                                </p>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowCreateModal(true)}
                                className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300 flex items-center space-x-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>New Ticket</span>
                            </motion.button>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            {[
                                { title: 'Total Tickets', value: tickets.length, color: 'from-rose-500 to-pink-500', icon: '🎫' },
                                { title: 'Open Tickets', value: tickets.filter((t: Ticket) => t.status === 'OPEN').length, color: 'from-red-500 to-rose-500', icon: '🔴' },
                                { title: 'In Progress', value: tickets.filter((t: Ticket) => t.status === 'IN_PROGRESS').length, color: 'from-yellow-500 to-orange-500', icon: '🟡' },
                                { title: 'Resolved', value: tickets.filter((t: Ticket) => t.status === 'RESOLVED').length, color: 'from-green-500 to-emerald-500', icon: '🟢' }
                            ].map((stat, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    whileHover={{ y: -5 }}
                                    className={`bg-gradient-to-r ${stat.color} rounded-2xl p-6 text-white shadow-xl`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-white/80 text-sm font-medium mb-1">{stat.title}</p>
                                            <p className="text-3xl font-black">{stat.value}</p>
                                        </div>
                                        <div className="text-4xl">{stat.icon}</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Tickets List */}
                            <div className="lg:col-span-2">
                                {/* Filters */}
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl mb-6">
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="flex-1">
                                            <select
                                                value={selectedStatus}
                                                onChange={(e) => setSelectedStatus(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 dark:focus:ring-rose-400 transition-all"
                                            >
                                                <option value="ALL">All Status</option>
                                                <option value="OPEN">Open</option>
                                                <option value="IN_PROGRESS">In Progress</option>
                                                <option value="RESOLVED">Resolved</option>
                                                <option value="CLOSED">Closed</option>
                                            </select>
                                        </div>
                                        <div className="flex-1">
                                            <select
                                                value={selectedPriority}
                                                onChange={(e) => setSelectedPriority(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 dark:focus:ring-rose-400 transition-all"
                                            >
                                                <option value="ALL">All Priority</option>
                                                <option value="LOW">Low</option>
                                                <option value="MEDIUM">Medium</option>
                                                <option value="HIGH">High</option>
                                                <option value="URGENT">Urgent</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Tickets List */}
                                <div className="space-y-4">
                                    {filteredTickets.map((ticket: Ticket, index: number) => (
                                        <motion.div
                                            key={ticket.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            whileHover={{ scale: 1.02 }}
                                            onClick={() => setSelectedTicket(ticket)}
                                            className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl cursor-pointer transition-all duration-300 border-2 ${selectedTicket?.id === ticket.id
                                                ? 'border-rose-300 dark:border-rose-600'
                                                : 'border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex-1">
                                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                                                        {ticket.title}
                                                    </h3>
                                                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                                                        {ticket.description}
                                                    </p>
                                                    <div className="flex items-center space-x-4 text-sm">
                                                        <span className="text-gray-500 dark:text-gray-400">
                                                            By {ticket.createdBy}
                                                        </span>
                                                        <span className="text-gray-500 dark:text-gray-400">
                                                            {new Date(ticket.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end space-y-2">
                                                    <div className="flex space-x-2">
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                                            <span className="mr-1">{getStatusIcon(ticket.status)}</span>
                                                            {ticket.status.replace('_', ' ')}
                                                        </span>
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                                                            <span className="mr-1">{getPriorityIcon(ticket.priority)}</span>
                                                            {ticket.priority}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                                        {ticket.category}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-4">
                                                    <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                        </svg>
                                                        <span>{ticket.messages.length} messages</span>
                                                    </div>
                                                    {ticket.assignedTo && (
                                                        <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                            </svg>
                                                            <span>{ticket.assignedTo}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition-colors"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </motion.button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                {filteredTickets.length === 0 && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-center py-20"
                                    >
                                        <div className="text-6xl mb-4">🎫</div>
                                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">No tickets found</h3>
                                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                                            Try adjusting your filters or create a new ticket
                                        </p>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setShowCreateModal(true)}
                                            className="bg-gradient-to-r from-rose-600 to-pink-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg"
                                        >
                                            Create New Ticket
                                        </motion.button>
                                    </motion.div>
                                )}
                            </div>

                            {/* Ticket Details */}
                            <div className="lg:col-span-1">
                                {selectedTicket ? (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl sticky top-6"
                                    >
                                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                                                {selectedTicket.title}
                                            </h2>
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>
                                                    <span className="mr-1">{getStatusIcon(selectedTicket.status)}</span>
                                                    {selectedTicket.status.replace('_', ' ')}
                                                </span>
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                                                    <span className="mr-1">{getPriorityIcon(selectedTicket.priority)}</span>
                                                    {selectedTicket.priority}
                                                </span>
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                                    {selectedTicket.category}
                                                </span>
                                            </div>

                                            {/* Status Change Buttons */}
                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Change Status
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(status => (
                                                        <motion.button
                                                            key={status}
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => handleUpdateStatus(selectedTicket.id, status)}
                                                            disabled={selectedTicket.status === status}
                                                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedTicket.status === status
                                                                ? 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 cursor-not-allowed'
                                                                : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800'
                                                                }`}
                                                        >
                                                            {status.replace('_', ' ')}
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            </div>

                                            <p className="text-gray-600 dark:text-gray-300 text-sm">
                                                {selectedTicket.description}
                                            </p>
                                        </div>

                                        {/* Messages */}
                                        <div className="p-6 max-h-96 overflow-y-auto">
                                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Messages</h3>
                                            <div className="space-y-4">
                                                {selectedTicket.messages.map(message => (
                                                    <div key={message.id} className="flex space-x-3">
                                                        <div className="w-8 h-8 bg-gradient-to-r from-rose-400 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                                            {message.senderName.split(' ').map(n => n[0]).join('')}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center space-x-2 mb-1">
                                                                <span className="text-sm font-medium text-gray-800 dark:text-white">
                                                                    {message.senderName}
                                                                </span>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                    {message.senderRole}
                                                                </span>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                    {new Date(message.createdAt).toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                                                {message.content}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Reply Box */}
                                        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                                            <div className="flex space-x-3">
                                                <input
                                                    type="text"
                                                    value={newMessage}
                                                    onChange={(e) => setNewMessage(e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                                    placeholder="Type your reply..."
                                                    maxLength={500}
                                                    className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 dark:focus:ring-rose-400 transition-all"
                                                />
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={handleSendMessage}
                                                    disabled={!newMessage.trim()}
                                                    className="bg-gradient-to-r from-rose-600 to-pink-600 text-white px-4 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                    </svg>
                                                </motion.button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center sticky top-6"
                                    >
                                        <div className="text-6xl mb-4">💬</div>
                                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                                            Select a Ticket
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-300">
                                            Choose a ticket from the list to view details and respond to messages.
                                        </p>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </main>
            </div>

            {/* Create Ticket Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                                    Create New Ticket
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Title
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="Enter ticket title"
                                            maxLength={100}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows={4}
                                            maxLength={1000}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="Describe the issue or request"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Priority
                                        </label>
                                        <select
                                            value={formData.priority}
                                            onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="LOW">Low</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="HIGH">High</option>
                                            <option value="URGENT">Urgent</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Category
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="Enter category (e.g., Technical, Academic, Facilities)"
                                            maxLength={50}
                                        />
                                    </div>
                                </div>

                                <div className="flex space-x-3 mt-6">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            setShowCreateModal(false);
                                            setFormData({
                                                title: '',
                                                description: '',
                                                priority: 'MEDIUM',
                                                category: 'General'
                                            });
                                        }}
                                        className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Cancel
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleCreate}
                                        disabled={isCreating}
                                        className="flex-1 px-4 py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white rounded-xl font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                                    >
                                        {isCreating ? (
                                            <div className="flex items-center justify-center">
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Creating...
                                            </div>
                                        ) : (
                                            'Create Ticket'
                                        )}
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
