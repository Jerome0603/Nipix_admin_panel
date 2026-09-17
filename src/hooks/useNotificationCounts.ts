import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export function useNotificationCounts() {
  const queryClient = useQueryClient();

  // Fetch new contact messages count
  const { data: newContactMessagesCount = 0 } = useQuery({
    queryKey: ['notification-count', 'contact-messages'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('contact_messages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new');
      
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Fetch pending registrations count
  const { data: pendingRegistrationsCount = 0 } = useQuery({
    queryKey: ['notification-count', 'registrations'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Set up realtime subscriptions for automatic updates
  useEffect(() => {
    const contactChannel = supabase
      .channel('contact-messages-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notification-count', 'contact-messages'] });
        }
      )
      .subscribe();

    const registrationsChannel = supabase
      .channel('registrations-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'registrations',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notification-count', 'registrations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(contactChannel);
      supabase.removeChannel(registrationsChannel);
    };
  }, [queryClient]);

  // Helper to invalidate counts (call when status is updated)
  const invalidateCounts = () => {
    queryClient.invalidateQueries({ queryKey: ['notification-count'] });
  };

  return {
    newContactMessagesCount,
    pendingRegistrationsCount,
    invalidateCounts,
  };
}
