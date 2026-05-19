import { useCollection, useCreateMutation, useDeleteMutation, useUpdateMutation } from './services/firestoreHooks';

export const useGetStaffQuery = () => useCollection('staff');
export const useCreateStaffMutation = () => useCreateMutation('staff');
export const useUpdateStaffMutation = () => useUpdateMutation('staff');
export const useDeleteStaffMutation = () => useDeleteMutation('staff');
