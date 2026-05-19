import { useCollection, useCreateMutation, useDeleteMutation, useUpdateMutation } from './services/firestoreHooks';

export const useGetStudentsQuery = () => useCollection('students');
export const useCreateStudentMutation = () => useCreateMutation('students');
export const useUpdateStudentMutation = () => useUpdateMutation('students');
export const useDeleteStudentMutation = () => useDeleteMutation('students');
