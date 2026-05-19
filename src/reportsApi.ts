import { useCollection, useCreateMutation } from './services/firestoreHooks';

export const useGetReportsQuery = () => useCollection('grades');
export const useSaveGradeMutation = () => useCreateMutation('grades');
