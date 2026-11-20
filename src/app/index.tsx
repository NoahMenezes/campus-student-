import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { isAuthenticated } from '@/services/auth';

export default function Root() {
  useEffect(() => {
    isAuthenticated().then((authed) => {
      if (authed) {
        router.replace('/home');
      } else {
        router.replace('/login');
      }
    });
  }, []);

  return <View style={{ flex: 1, backgroundColor: '#020408' }} />;
}
