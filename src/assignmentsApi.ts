import { useCollection, useCreateMutation } from './services/firestoreHooks';

export const useGetAssignmentsQuery = () => useCollection('assignments');
export const useCreateAssignmentMutation = () => useCreateMutation('assignments');
