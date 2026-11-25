import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { getUser, isAuthenticated } from '@/services/auth';

export default function Root() {
  useEffect(() => {
    isAuthenticated().then(async (authed) => {
      if (authed) {
        const u = await getUser().catch(() => null);
        router.replace((u?.role === 'admin' ? '/demo-center' : '/home') as any);
      } else {
        router.replace('/login');
      }
    });
  }, []);

  return <View style={{ flex: 1, backgroundColor: '#020408' }} />;
}
