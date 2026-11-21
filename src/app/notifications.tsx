import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabBar } from '@/components/bottom-tab-bar';
import { getStudentBatch } from '@/services/attendance-manager';
import {
  checkAndDispatchLectureAlerts,
  clearAllNotifications,
  getStoredNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/services/notifications';
import { AppNotification } from '@/types/attendance';

const BG_MAIN = '#0A0B10';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const batch = await getStudentBatch();
      await checkAndDispatchLectureAlerts(batch);
      const list = await getStoredNotifications();
      setNotifications(list);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearAll = async () => {
    await clearAllNotifications();
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={styles.root}>
      <Image
        source={require('@/assets/konnakol_background.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="center"
      />
      <LinearGradient
        colors={['rgba(10,11,16,0.50)', 'rgba(24,27,36,0.80)', 'rgba(10,11,16,0.96)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
          }
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.subTitle}>ALERTS &amp; TIMETABLE</Text>
              <Text style={styles.title}>Notifications</Text>
            </View>

            {notifications.length > 0 && (
              <View style={styles.actionsTop}>
                {unreadCount > 0 && (
                  <Pressable onPress={handleMarkAllRead} style={styles.actionPill}>
                    <Text style={styles.actionPillText}>Read all</Text>
                  </Pressable>
                )}
                <Pressable onPress={handleClearAll} style={styles.actionPillDanger}>
                  <Text style={styles.actionPillDangerText}>Clear</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Empty state */}
          {notifications.length === 0 && !loading && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptyDesc}>
                You will receive alerts here automatically whenever your scheduled lectures begin.
              </Text>
            </View>
          )}

          {/* Notifications List */}
          {notifications.map((notif, index) => (
            <Animated.View
              key={notif.id}
              entering={FadeInUp.delay(index * 30).duration(300)}
              style={[styles.notifCard, !notif.read && styles.notifCardUnread]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.badgeRow}>
                  {!notif.read && <View style={styles.unreadDot} />}
                  <Text style={styles.notifType}>LECTURE STARTED</Text>
                </View>
                <Text style={styles.timeLabel}>
                  {new Date(notif.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>

              <Text style={styles.notifTitle}>{notif.title}</Text>
              <Text style={styles.notifBody}>{notif.body}</Text>

              <View style={styles.cardBottom}>
                <Pressable
                  onPress={() => {
                    handleMarkAsRead(notif.id);
                    router.push('/today' as any);
                  }}
                  style={styles.markBtn}
                >
                  <Text style={styles.markBtnText}>Mark Attendance &rarr;</Text>
                </Pressable>

                {!notif.read && (
                  <Pressable
                    onPress={() => handleMarkAsRead(notif.id)}
                    style={styles.dimBtn}
                  >
                    <Text style={styles.dimBtnText}>Dismiss</Text>
                  </Pressable>
                )}
              </View>
            </Animated.View>
          ))}
        </ScrollView>

        <BottomTabBar />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_MAIN,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F5F5F7',
    letterSpacing: -0.4,
  },
  actionsTop: {
    flexDirection: 'row',
    gap: 8,
  },
  actionPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 0,
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E5E7EB',
  },
  actionPillDanger: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: 0,
  },
  actionPillDangerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  emptyCard: {
    backgroundColor: 'rgba(16,20,26,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 0,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5F5F7',
  },
  emptyDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.60)',
    textAlign: 'center',
    lineHeight: 18,
  },
  notifCard: {
    backgroundColor: 'rgba(16,20,26,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 0,
    padding: 16,
    gap: 8,
  },
  notifCardUnread: {
    borderColor: '#387BFF',
    backgroundColor: 'rgba(20,28,45,0.88)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadDot: {
    width: 6,
    height: 6,
    backgroundColor: '#387BFF',
    borderRadius: 0,
  },
  notifType: {
    fontSize: 10,
    fontWeight: '700',
    color: '#387BFF',
    letterSpacing: 0.5,
  },
  timeLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F5F5F7',
  },
  notifBody: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.70)',
    lineHeight: 18,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  markBtn: {
    backgroundColor: '#0052FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 0,
  },
  markBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dimBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  dimBtnText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
