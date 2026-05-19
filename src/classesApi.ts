import { useCollection, useCreateMutation, useDeleteMutation, useUpdateMutation } from './services/firestoreHooks';

export const useGetClassesQuery = (_?: unknown) => useCollection('classes');
export const useCreateClassMutation = () => useCreateMutation('classes');
export const useUpdateClassMutation = () => useUpdateMutation('classes');
export const useDeleteClassMutation = () => useDeleteMutation('classes');
