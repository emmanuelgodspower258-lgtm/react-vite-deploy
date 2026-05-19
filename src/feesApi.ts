import { useCollection, useCreateMutation } from './services/firestoreHooks';

export const useGetFeesQuery = () => useCollection('fees');
export const useAddPaymentMutation = () => useCreateMutation('fees');
