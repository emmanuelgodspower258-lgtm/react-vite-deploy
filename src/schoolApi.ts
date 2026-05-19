import { useCollection, useCreateMutation, useDeleteMutation, useUpdateMutation } from './services/firestoreHooks';

export const useGetSchoolsQuery = () => useCollection('schools');
export const useCreateSchoolMutation = () => useCreateMutation('schools');
export const useUpdateSchoolMutation = () => useUpdateMutation('schools');
export const useDeleteSchoolMutation = () => useDeleteMutation('schools');
