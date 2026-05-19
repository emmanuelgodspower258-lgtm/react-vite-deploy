import { useCollection, useCreateMutation } from './services/firestoreHooks';

export const useGetReportCardsQuery = () => useCollection('reportCards');
export const usePublishReportCardMutation = () => useCreateMutation('reportCards');
