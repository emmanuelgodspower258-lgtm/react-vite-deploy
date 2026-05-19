import { useCollection, useCreateMutation, useDeleteMutation, useUpdateMutation } from './services/firestoreHooks';

export const useGetSubjectsQuery = () => useCollection('subjects');
export const useCreateSubjectMutation = () => useCreateMutation('subjects');
export const useUpdateSubjectMutation = () => useUpdateMutation('subjects');
export const useDeleteSubjectMutation = () => useDeleteMutation('subjects');
