import { QueryClient } from '@tanstack/react-query';

// Shared instance so modules outside the component tree (the auth store,
// on logout) can clear cached data without needing a React context.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
