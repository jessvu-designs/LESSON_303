import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
  },
});

export const qk = {
  me: ['me'] as const,
  vehicles: ['vehicles'] as const,
  paymentMethods: ['paymentMethods'] as const,
  zones: ['zones'] as const,
  zone: (id: string) => ['zone', id] as const,
  quote: (zoneId: string, minutes: number) => ['quote', zoneId, minutes] as const,
  activeSession: ['session', 'active'] as const,
  sessions: ['sessions'] as const,
  session: (id: string) => ['session', id] as const,
};
