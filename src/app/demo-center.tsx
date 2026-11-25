import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AttendanceChangeEvent,
  LowAttendanceAlert,
  subscribeAttendanceLiveChange,
  subscribeLowAttendanceAlert,
} from '@/services/attendance-stream';
import { AuthUser, getUser, logout } from '@/services/auth';
import {
  BenchmarkData,
  DemoHealthData,
  ExplorerData,
  fetchComparisonBenchmark,
  fetchDemoHealth,
  fetchExplorerCollection,
  fetchOplog,
  fetchReplicaSetInfo,
  fetchShardingInfo,
  fetchValidators,
  ReplicaSetData,
  resetDemoDatabase,
  runWriteConcernBenchmark,
  ShardingDemoData,
  ValidatorItem,
  WriteConcernTestData,
} from '@/services/demo-center';

type DemoTab = 'health' | 'explorer' | 'replica' | 'sharding' | 'comparison';

const COLLECTIONS = [
  'users',
  'students',
  'courses',
  'timetable_slots',
  'attendance',
  'notifications',
  'audit_log',
];

const MONO = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const BSON_COLORS: Record<string, string> = {
  objectId: '#A78BFA',
  date: '#34D399',
  int: '#60A5FA',
  double: '#38BDF8',
  bool: '#FBBF24',
  string: '#F472B6',
  null: '#9CA3AF',
  object: '#FB923C',
  array: '#2DD4BF',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function DemoCenterScreen() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<DemoTab>('health');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  // Tab states
  const [health, setHealth] = useState<DemoHealthData | null>(null);
  const [selectedCol, setSelectedCol] = useState<string>('attendance');
  const [explorer, setExplorer] = useState<ExplorerData | null>(null);
  const [validators, setValidators] = useState<ValidatorItem[]>([]);
  const [replicaSet, setReplicaSet] = useState<ReplicaSetData | null>(null);
  const [oplogEntries, setOplogEntries] = useState<ReplicaSetData['oplog']['entries']>([]);
  const [wcResult, setWcResult] = useState<WriteConcernTestData | null>(null);
  const [wcRunning, setWcRunning] = useState(false);
  const [sharding, setSharding] = useState<ShardingDemoData | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);

  // Live SSE Change Stream feed
  const [liveEvents, setLiveEvents] = useState<AttendanceChangeEvent[]>([]);
  const [liveAlert, setLiveAlert] = useState<LowAttendanceAlert | null>(null);

  useEffect(() => {
    const unsubChange = subscribeAttendanceLiveChange((ev) => {
      setLiveEvents((prev) => [ev, ...prev].slice(0, 8));
    });
    const unsubAlert = subscribeLowAttendanceAlert((alert) => {
      setLiveAlert(alert);
    });
    return () => {
      unsubChange();
      unsubAlert();
    };
  }, []);

  const loadTabData = useCallback(
    async (tab: DemoTab, colName = selectedCol) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        if (tab === 'health') {
          setHealth(await fetchDemoHealth());
        } else if (tab === 'explorer') {
          const [exp, valRes] = await Promise.all([
            fetchExplorerCollection(colName),
            fetchValidators(),
          ]);
          setExplorer(exp);
          setValidators(valRes.validators || []);
        } else if (tab === 'replica') {
          const rs = await fetchReplicaSetInfo();
          setReplicaSet(rs);
          setOplogEntries(rs.oplog?.entries || []);
        } else if (tab === 'sharding') {
          setSharding(await fetchShardingInfo());
        } else if (tab === 'comparison') {
          setBenchmark(await fetchComparisonBenchmark('24CE002'));
        }
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load demo metrics');
      } finally {
        setLoading(false);
      }
    },
    [selectedCol]
  );

  useFocusEffect(
    useCallback(() => {
      getUser().then((u) => {
        setAuthUser(u);
        setAuthChecked(true);
        if (u?.role === 'admin') {
          loadTabData(activeTab, selectedCol);
        }
      });
    }, [activeTab, selectedCol, loadTabData])
  );

  const handleSelectCollection = (col: string) => {
    setSelectedCol(col);
    loadTabData('explorer', col);
  };

  const handleRefreshOplog = async () => {
    try {
      const res = await fetchOplog(20);
      setOplogEntries(res.entries || []);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to refresh oplog');
    }
  };

  const handleWriteConcernTest = async () => {
    setWcRunning(true);
    setErrorMsg(null);
    try {
      const res = await runWriteConcernBenchmark(15);
      setWcResult(res);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Write concern benchmark failed');
    } finally {
      setWcRunning(false);
    }
  };

  const performReset = async () => {
    setResetting(true);
    setErrorMsg(null);
    try {
      const res = await resetDemoDatabase();
      setStatusBanner(
        `Re-seeded in ${res.elapsedMs}ms: ${res.counts.students} students, ${res.counts.attendance} attendance rows`
      );
      await loadTabData(activeTab, selectedCol);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Demo reset failed');
    } finally {
      setResetting(false);
    }
  };

  const handleResetDemoData = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm('Clear all collections and re-seed fresh demo data?')) {
        performReset();
      }
      return;
    }
    Alert.alert(
      'Reset Demo Data',
      'This clears all collections and re-seeds fresh demo records. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset & Re-seed', style: 'destructive', onPress: performReset },
      ]
    );
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login' as any);
  };

  if (!authChecked) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.centerState}>
          <ActivityIndicator size="large" color="#60A5FA" />
        </SafeAreaView>
      </View>
    );
  }

  if (!authUser || authUser.role !== 'admin') {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#090B12', '#121728', '#090B12']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.centerState}>
          <View style={styles.lockCard}>
            <Text style={styles.lockEyebrow}>RESTRICTED ROUTE</Text>
            <Text style={styles.lockTitle}>Admin Access Required</Text>
            <Text style={styles.lockDesc}>
              Demo Center is hidden for student accounts. Sign in with an administrator account
              (e.g. admin@gec.ac.in) to inspect cluster telemetry, validators, benchmarks, and change streams.
            </Text>
            <View style={styles.lockActions}>
              <Pressable onPress={() => router.replace('/home' as any)} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Back to Home</Text>
              </Pressable>
              <Pressable onPress={handleLogout} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Sign In as Admin</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#090B12', '#101524', '#090B12']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safeArea}>
        {/* Top Admin Header */}
        <View style={styles.topHeader}>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>ADMIN MONGODB CONSOLE</Text>
            <Text style={styles.pageTitle}>Demo Center</Text>
          </View>
          <View style={styles.topBtnRow}>
            <Pressable
              onPress={handleResetDemoData}
              disabled={resetting}
              style={[styles.resetBtn, resetting && styles.btnDisabled]}
            >
              <Text style={styles.resetBtnText}>
                {resetting ? 'Re-seeding...' : 'Reset Demo Data'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => loadTabData(activeTab, selectedCol)}
              style={styles.refreshBtn}
            >
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </Pressable>
            <Pressable onPress={handleLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutBtnText}>Logout</Text>
            </Pressable>
          </View>
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
          contentContainerStyle={styles.tabRow}
        >
          {(
            [
              ['health', 'Health (T1)'],
              ['explorer', 'Explorer (T2)'],
              ['replica', 'Replica Set (T8)'],
              ['sharding', 'Sharding (T9)'],
              ['comparison', 'Comparison (T10)'],
            ] as const
          ).map(([key, label]) => {
            const active = activeTab === key;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  setActiveTab(key);
                  loadTabData(key, selectedCol);
                }}
                style={[styles.tabPill, active && styles.tabPillActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentInner}>
          {statusBanner ? (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>{statusBanner}</Text>
            </View>
          ) : null}

          {liveAlert ? (
            <View style={styles.alertBanner}>
              <Text style={styles.alertBannerTitle}>LIVE &lt;75% ATTENDANCE ALERT (SSE)</Text>
              <Text style={styles.alertBannerText}>{liveAlert.message}</Text>
            </View>
          ) : null}

          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#60A5FA" />
            </View>
          ) : null}

          {/* TAB 1: SERVER HEALTH (T1) */}
          {!loading && activeTab === 'health' && health ? (
            <View style={styles.sectionStack}>
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>MongoDB Cluster Health</Text>
                  <View
                    style={[
                      styles.badgePill,
                      health.status === 'ok' ? styles.badgeGreen : styles.badgeAmber,
                    ]}
                  >
                    <Text style={styles.badgeText}>{health.status.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.kvGrid}>
                  <View style={styles.kvItem}>
                    <Text style={styles.kvLabel}>ADMIN PING</Text>
                    <Text style={styles.kvValue}>{health.ping?.ok === 1 ? 'ok: 1' : 'down'}</Text>
                  </View>
                  <View style={styles.kvItem}>
                    <Text style={styles.kvLabel}>MONGODB VERSION</Text>
                    <Text style={styles.kvValue}>{health.version || 'N/A'}</Text>
                  </View>
                  <View style={styles.kvItem}>
                    <Text style={styles.kvLabel}>READYSTATE</Text>
                    <Text style={styles.kvValue}>
                      {health.readyState} ({health.readyStateLabel})
                    </Text>
                  </View>
                  <View style={styles.kvItem}>
                    <Text style={styles.kvLabel}>REPLICA SET</Text>
                    <Text style={styles.kvValue}>{health.replicaSet || 'None'}</Text>
                  </View>
                  <View style={styles.kvItem}>
                    <Text style={styles.kvLabel}>ACTIVE PRIMARY</Text>
                    <Text style={styles.kvValue}>{health.replicaPrimary || 'N/A'}</Text>
                  </View>
                  <View style={styles.kvItem}>
                    <Text style={styles.kvLabel}>API PORT</Text>
                    <Text style={styles.kvValue}>{String(health.port)}</Text>
                  </View>
                </View>
              </View>

              {health.members.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Topology Snapshot</Text>
                  {health.members.map((m) => (
                    <View key={m.id} style={styles.memberRow}>
                      <Text style={styles.monoStrong}>{m.name}</Text>
                      <Text
                        style={[
                          styles.stateTag,
                          m.stateStr === 'PRIMARY' ? styles.textGreen : styles.textBlue,
                        ]}
                      >
                        {m.stateStr} (health={m.health})
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : null}

          {/* TAB 2: DATA EXPLORER + BSON BADGES & VALIDATORS (T2) */}
          {!loading && activeTab === 'explorer' ? (
            <View style={styles.sectionStack}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.subPillRow}
              >
                {COLLECTIONS.map((col) => {
                  const active = selectedCol === col;
                  return (
                    <Pressable
                      key={col}
                      onPress={() => handleSelectCollection(col)}
                      style={[styles.subPill, active && styles.subPillActive]}
                    >
                      <Text style={[styles.subPillText, active && styles.subPillTextActive]}>
                        {col}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {explorer ? (
                <>
                  <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardTitle}>{explorer.collection}</Text>
                      <Text style={styles.mutedMeta}>
                        {explorer.totalDocuments.toLocaleString()} docs &bull; {explorer.indexes.length} indexes
                      </Text>
                    </View>

                    <Text style={styles.subHeading}>BSON FIELD TYPE MAP</Text>
                    <View style={styles.bsonWrap}>
                      {Object.entries(explorer.bsonTypeMap).map(([field, types]) => {
                        const t = types[0] || 'unknown';
                        const color = BSON_COLORS[t] || '#93C5FD';
                        return (
                          <View key={field} style={styles.bsonBadge}>
                            <Text style={styles.bsonField}>{field}</Text>
                            <Text style={[styles.bsonType, { color }]}>{types.join('|')}</Text>
                          </View>
                        );
                      })}
                    </View>

                    <Text style={styles.subHeading}>INDEXES</Text>
                    {explorer.indexes.map((idx) => (
                      <View key={idx.name} style={styles.indexRow}>
                        <Text style={styles.monoStrong}>{idx.name}</Text>
                        <Text style={styles.monoMuted}>
                          {JSON.stringify(idx.key)}
                          {idx.unique ? ' • UNIQUE' : ''}
                          {idx.expireAfterSeconds ? ` • TTL ${idx.expireAfterSeconds}s` : ''}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Sample Documents ({explorer.sampleCount})</Text>
                    {explorer.samples.map((doc, idx) => (
                      <ScrollView key={idx} horizontal style={styles.codeBox}>
                        <Text selectable style={styles.codeText}>
                          {JSON.stringify(doc, null, 2)}
                        </Text>
                      </ScrollView>
                    ))}
                  </View>
                </>
              ) : null}

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Active $jsonSchema Validators ({validators.length})</Text>
                {validators.map((v) => (
                  <View key={v.collection} style={styles.validatorCard}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.monoStrong}>{v.collection}</Text>
                      <Text style={styles.textAmber}>
                        level={v.validationLevel || 'none'} &bull; action={v.validationAction || 'none'}
                      </Text>
                    </View>
                    <ScrollView horizontal style={styles.codeBox}>
                      <Text selectable style={styles.codeText}>
                        {JSON.stringify(v.validator, null, 2)}
                      </Text>
                    </ScrollView>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* TAB 3: REPLICA SET + KILL-PRIMARY + OPLOG + WRITE CONCERN + SSE (T8) */}
          {!loading && activeTab === 'replica' && replicaSet ? (
            <View style={styles.sectionStack}>
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Replica Set Members ({replicaSet.replicaSet || 'rs0'})</Text>
                  <Text style={styles.textGreen}>Primary: {replicaSet.replicaPrimary || 'Electing...'}</Text>
                </View>

                {replicaSet.members.map((m) => (
                  <View key={m.id} style={styles.rsMemberCard}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.monoStrong}>{m.name}</Text>
                      <View
                        style={[
                          styles.badgePill,
                          m.stateStr === 'PRIMARY'
                            ? styles.badgeGreen
                            : m.health === 1
                              ? styles.badgeBlue
                              : styles.badgeRed,
                        ]}
                      >
                        <Text style={styles.badgeText}>{m.stateStr}</Text>
                      </View>
                    </View>
                    <Text style={styles.mutedMeta}>
                      health={m.health} &bull; uptime={m.uptime}s &bull; ping={m.pingMs}ms
                      {m.syncSourceHost ? ` • syncFrom=${m.syncSourceHost}` : ''}
                    </Text>
                    {m.optimeDate ? (
                      <Text style={styles.monoMuted}>optime: {m.optimeDate}</Text>
                    ) : null}
                  </View>
                ))}
              </View>

              {/* w:majority vs w:1 write test */}
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Write Concern Test: w: &quot;majority&quot; vs w: 1</Text>
                  <Pressable
                    onPress={handleWriteConcernTest}
                    disabled={wcRunning}
                    style={[styles.primaryBtn, wcRunning && styles.btnDisabled]}
                  >
                    <Text style={styles.primaryBtnText}>
                      {wcRunning ? 'Running...' : 'Run 15x2 Write Test'}
                    </Text>
                  </Pressable>
                </View>

                {wcResult ? (
                  <View style={styles.wcGrid}>
                    <View style={styles.wcBox}>
                      <Text style={styles.wcTitle}>{wcResult.w1.label}</Text>
                      <Text style={styles.wcMetric}>{wcResult.w1.totalMs} ms</Text>
                      <Text style={styles.mutedMeta}>
                        {wcResult.w1.avgMs} ms/write &bull; {wcResult.w1.opsPerSec} ops/sec
                      </Text>
                      <Text style={styles.mutedSmall}>{wcResult.w1.durability}</Text>
                    </View>
                    <View style={styles.wcBox}>
                      <Text style={styles.wcTitle}>{wcResult.wMajority.label}</Text>
                      <Text style={[styles.wcMetric, styles.textGreen]}>
                        {wcResult.wMajority.totalMs} ms
                      </Text>
                      <Text style={styles.mutedMeta}>
                        {wcResult.wMajority.avgMs} ms/write &bull; {wcResult.wMajority.opsPerSec} ops/sec
                      </Text>
                      <Text style={styles.mutedSmall}>{wcResult.wMajority.durability}</Text>
                    </View>
                    <Text style={styles.textAmber}>
                      Quorum Replication Overhead: {wcResult.overheadMs >= 0 ? '+' : ''}
                      {wcResult.overheadMs} ms ({wcResult.overheadPct}%)
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.mutedMeta}>
                    Tap &quot;Run 15x2 Write Test&quot; to benchmark live primary-only vs quorum writes.
                  </Text>
                )}
              </View>

              {/* Kill-Primary Instructions */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Failover Drill (kill-primary.sh)</Text>
                {replicaSet.killPrimaryInstructions.map((step, idx) => (
                  <Text key={idx} style={styles.instructionLine}>
                    {step}
                  </Text>
                ))}
              </View>

              {/* Oplog Viewer */}
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Oplog Viewer (local.oplog.rs)</Text>
                  <Pressable onPress={handleRefreshOplog} style={styles.secondaryBtn}>
                    <Text style={styles.secondaryBtnText}>Reload Oplog</Text>
                  </Pressable>
                </View>
                {!replicaSet.oplog.supported ? (
                  <Text style={styles.mutedMeta}>{replicaSet.oplog.reason || 'Unavailable'}</Text>
                ) : (
                  oplogEntries.map((entry, idx) => (
                    <View key={idx} style={styles.oplogRow}>
                      <Text style={styles.monoStrong}>
                        [{entry.op}] {entry.ns}
                      </Text>
                      <Text style={styles.monoMuted}>{entry.wall || ''}</Text>
                      <Text numberOfLines={2} style={styles.codeText}>
                        {JSON.stringify(entry.o)}
                      </Text>
                    </View>
                  ))
                )}
              </View>

              {/* Live Change Stream Events */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>SSE Change Stream on `attendance`</Text>
                {liveEvents.length === 0 ? (
                  <Text style={styles.mutedMeta}>
                    Listening live on /demo/attendance-stream — mark or undo attendance on any device to stream events here.
                  </Text>
                ) : (
                  liveEvents.map((ev, idx) => (
                    <View key={idx} style={styles.oplogRow}>
                      <Text style={styles.monoStrong}>
                        {ev.operationType.toUpperCase()} &bull; {ev.studentName || ev.studentId} ({ev.rollNo || '—'}) &bull; {ev.status || 'deleted'}
                      </Text>
                      <Text style={ev.droppedBelow75 ? styles.textRed : styles.textGreen}>
                        Overall: {ev.overall?.percentage ?? 'null'}% ({ev.overall?.present ?? 0}/{ev.overall?.marked ?? 0})
                        {ev.droppedBelow75 ? ' • DROPPED BELOW 75%' : ''}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          ) : null}

          {/* TAB 4: SHARDING PER-SHARD DISTRIBUTION BAR CHART (T9) */}
          {!loading && activeTab === 'sharding' && sharding ? (
            <View style={styles.sectionStack}>
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>
                    Sharded Cluster ({sharding.isShardedCluster ? 'mongos Router' : 'rs0 Standalone'})
                  </Text>
                  <Text style={styles.textBlue}>{sharding.shards.length || 1} Shard(s)</Text>
                </View>

                {sharding.listShardsNote ? (
                  <Text style={styles.textAmber}>{sharding.listShardsNote}</Text>
                ) : null}

                {sharding.shards.map((s) => (
                  <View key={s._id} style={styles.memberRow}>
                    <Text style={styles.monoStrong}>{s._id}</Text>
                    <Text style={styles.monoMuted}>
                      {s.host} (state={s.state})
                    </Text>
                  </View>
                ))}
              </View>

              {/* Attendance & Notifications Bar Charts */}
              {(['attendance', 'notifications'] as const).map((colKey) => {
                const colStats = sharding.collections[colKey];
                const maxCount = Math.max(
                  1,
                  ...colStats.perShard.map((s) => s.storageStats.count)
                );
                const shardKeyMeta = sharding.shardKeys[colKey];
                return (
                  <View key={colKey} style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardTitle}>
                        {colKey} ({colStats.totalDocs.toLocaleString()} docs)
                      </Text>
                      <Text style={styles.textBlue}>
                        {shardKeyMeta.strategy.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.monoMuted}>
                      Shard Key: {JSON.stringify(shardKeyMeta.key)}
                    </Text>

                    {colStats.perShard.map((s) => {
                      const pctOfTotal =
                        colStats.totalDocs > 0
                          ? Math.round((s.storageStats.count / colStats.totalDocs) * 100)
                          : 0;
                      const barPct = Math.max(4, Math.round((s.storageStats.count / maxCount) * 100));
                      const chunkMatch = colStats.chunks.find((c) => c._id === s.shard);

                      return (
                        <View key={s.shard} style={styles.barGroup}>
                          <View style={styles.cardHeaderRow}>
                            <Text style={styles.monoStrong}>{s.shard}</Text>
                            <Text style={styles.mutedMeta}>
                              {s.storageStats.count.toLocaleString()} docs ({pctOfTotal}%) &bull;{' '}
                              {formatBytes(s.storageStats.size)}
                              {chunkMatch ? ` • ${chunkMatch.chunkCount} chunks` : ''}
                            </Text>
                          </View>
                          <View style={styles.barTrack}>
                            <View
                              style={[
                                styles.barFill,
                                {
                                  width: `${barPct}%`,
                                  backgroundColor:
                                    colKey === 'attendance' ? '#3B82F6' : '#10B981',
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.mutedSmall}>
                            storageSize: {formatBytes(s.storageStats.storageSize)} &bull; indexSize:{' '}
                            {formatBytes(s.storageStats.totalIndexSize)} &bull; avgObj:{' '}
                            {s.storageStats.avgObjSize}B
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })}

              {/* DateKey Write Hotspot Explanation */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Why `dateKey` Alone Creates a Write Hotspot</Text>
                <Text style={styles.bodyCopy}>
                  {sharding.writeHotspotExplanation.whyDateKeyAloneHotspots}
                </Text>
                <Text style={styles.subHeading}>WHY {'{ studentId: 1, dateKey: 1 }'} FIXES IT</Text>
                <Text style={styles.bodyCopy}>
                  {sharding.writeHotspotExplanation.whyStudentIdPrefixFixesIt}
                </Text>
              </View>
            </View>
          ) : null}

          {/* TAB 5: COMPARISON & BENCHMARK (T10) */}
          {!loading && activeTab === 'comparison' && benchmark ? (
            <View style={styles.sectionStack}>
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>
                    3-Way Overall Attendance Benchmark ({benchmark.targetStudent.rollNo})
                  </Text>
                  <Text style={styles.mutedMeta}>
                    {benchmark.totalCollectionDocs.toLocaleString()} rows in `attendance`
                  </Text>
                </View>

                {benchmark.methods.map((m) => {
                  const maxMs = Math.max(0.1, ...benchmark.methods.map((x) => x.ms));
                  const barW = Math.max(6, Math.round((m.ms / maxMs) * 100));
                  return (
                    <View key={m.id} style={styles.barGroup}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={styles.monoStrong}>{m.label}</Text>
                        <Text style={m.id === 'group_with_index' ? styles.textGreen : styles.textAmber}>
                          {m.ms} ms
                        </Text>
                      </View>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              width: `${barW}%`,
                              backgroundColor:
                                m.id === 'group_with_index'
                                  ? '#10B981'
                                  : m.id === 'group_no_index'
                                    ? '#F59E0B'
                                    : '#EF4444',
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.mutedSmall}>
                        stage={m.stage} &bull; docsExamined={m.totalDocsExamined.toLocaleString()} &bull;
                        pulledToNode={m.docsPulledIntoNode} &bull; result={m.result.present}/
                        {m.result.marked} ({m.result.percentage}%)
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Replication vs Sharding Side-by-Side */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Replication vs Sharding</Text>
                <View style={styles.sideBySide}>
                  <View style={styles.sideCol}>
                    <Text style={styles.textGreen}>REPLICATION (rs0)</Text>
                    <Text style={styles.bodyCopy}>
                      Goal: {benchmark.replicationVsSharding.replication.goal}
                    </Text>
                    <Text style={styles.mutedSmall}>
                      {benchmark.replicationVsSharding.replication.mechanism}
                    </Text>
                    <Text style={styles.mutedSmall}>
                      Data: {benchmark.replicationVsSharding.replication.dataScope}
                    </Text>
                    <Text style={styles.mutedSmall}>
                      {benchmark.replicationVsSharding.replication.handles}
                    </Text>
                  </View>
                  <View style={styles.sideCol}>
                    <Text style={styles.textBlue}>SHARDING (mongos)</Text>
                    <Text style={styles.bodyCopy}>
                      Goal: {benchmark.replicationVsSharding.sharding.goal}
                    </Text>
                    <Text style={styles.mutedSmall}>
                      {benchmark.replicationVsSharding.sharding.mechanism}
                    </Text>
                    <Text style={styles.mutedSmall}>
                      Data: {benchmark.replicationVsSharding.sharding.dataScope}
                    </Text>
                    <Text style={styles.mutedSmall}>
                      {benchmark.replicationVsSharding.sharding.handles}
                    </Text>
                  </View>
                </View>
              </View>

              {/* AsyncStorage vs MongoDB Table */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>AsyncStorage vs MongoDB</Text>
                {benchmark.asyncStorageVsMongoDB.map((row) => (
                  <View key={row.dimension} style={styles.tableRow}>
                    <Text style={styles.tableDim}>{row.dimension}</Text>
                    <View style={styles.sideBySide}>
                      <View style={styles.sideCol}>
                        <Text style={styles.textAmber}>AsyncStorage (Old)</Text>
                        <Text style={styles.mutedSmall}>{row.asyncStorage}</Text>
                      </View>
                      <View style={styles.sideCol}>
                        <Text style={styles.textGreen}>MongoDB</Text>
                        <Text style={styles.mutedSmall}>{row.mongoDB}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#090B12' },
  safeArea: { flex: 1 },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  lockCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#111420',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    padding: 20,
    gap: 10,
  },
  lockEyebrow: { color: '#F59E0B', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  lockTitle: { color: '#F5F5F7', fontSize: 22, fontWeight: '700' },
  lockDesc: { color: '#9CA3AF', fontSize: 13, lineHeight: 19 },
  lockActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 10,
    flexWrap: 'wrap',
  },
  titleBlock: { gap: 2 },
  eyebrow: { color: '#60A5FA', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  pageTitle: { color: '#F5F5F7', fontSize: 22, fontWeight: '800' },
  topBtnRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  resetBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  resetBtnText: { color: '#FBBF24', fontSize: 12, fontWeight: '700' },
  refreshBtn: {
    backgroundColor: 'rgba(0, 82, 255, 0.2)',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  refreshBtnText: { color: '#93C5FD', fontSize: 12, fontWeight: '700' },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  logoutBtnText: { color: '#FCA5A5', fontSize: 12, fontWeight: '700' },
  tabScroll: { maxHeight: 46, flexGrow: 0 },
  tabRow: { paddingHorizontal: 18, gap: 8, alignItems: 'center' },
  tabPill: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tabPillActive: { backgroundColor: '#0052FF', borderColor: '#60A5FA' },
  tabText: { color: '#9CA3AF', fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: '#FFFFFF' },
  contentScroll: { flex: 1 },
  contentInner: { padding: 18, gap: 14, paddingBottom: 48 },
  loadingWrap: { paddingVertical: 40, alignItems: 'center' },
  sectionStack: { gap: 14 },
  card: {
    backgroundColor: 'rgba(17, 20, 32, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardTitle: { color: '#F5F5F7', fontSize: 16, fontWeight: '700' },
  subHeading: { color: '#9CA3AF', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 4 },
  kvGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kvItem: {
    minWidth: 140,
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 10,
  },
  kvLabel: { color: '#9CA3AF', fontSize: 10, fontWeight: '700' },
  kvValue: { color: '#F5F5F7', fontSize: 13, fontWeight: '700', marginTop: 3, fontFamily: MONO },
  badgePill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1 },
  badgeGreen: { backgroundColor: 'rgba(16,185,129,0.16)', borderColor: '#10B981' },
  badgeAmber: { backgroundColor: 'rgba(245,158,11,0.16)', borderColor: '#F59E0B' },
  badgeBlue: { backgroundColor: 'rgba(59,130,246,0.16)', borderColor: '#3B82F6' },
  badgeRed: { backgroundColor: 'rgba(239,68,68,0.16)', borderColor: '#EF4444' },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  rsMemberCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  subPillRow: { gap: 8 },
  subPill: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  subPillActive: { backgroundColor: 'rgba(0, 82, 255, 0.28)', borderColor: '#60A5FA' },
  subPillText: { color: '#9CA3AF', fontSize: 12, fontFamily: MONO },
  subPillTextActive: { color: '#FFFFFF', fontWeight: '700' },
  bsonWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bsonBadge: {
    flexDirection: 'row',
    gap: 5,
    backgroundColor: '#090B12',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  bsonField: { color: '#E5E7EB', fontSize: 11, fontFamily: MONO },
  bsonType: { fontSize: 11, fontWeight: '700', fontFamily: MONO },
  indexRow: {
    backgroundColor: '#090B12',
    borderRadius: 8,
    padding: 8,
    gap: 2,
  },
  validatorCard: { gap: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  codeBox: {
    backgroundColor: '#07090F',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 10,
    maxHeight: 220,
  },
  codeText: { color: '#D1D5DB', fontSize: 11, fontFamily: MONO, lineHeight: 16 },
  wcGrid: { gap: 10 },
  wcBox: { backgroundColor: '#090B12', borderRadius: 10, padding: 12, gap: 4 },
  wcTitle: { color: '#93C5FD', fontSize: 12, fontWeight: '700' },
  wcMetric: { color: '#FBBF24', fontSize: 20, fontWeight: '800', fontFamily: MONO },
  instructionLine: { color: '#D1D5DB', fontSize: 12, lineHeight: 18 },
  oplogRow: {
    backgroundColor: '#090B12',
    borderRadius: 8,
    padding: 9,
    gap: 3,
  },
  barGroup: { gap: 5, paddingTop: 4 },
  barTrack: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 6 },
  sideBySide: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  sideCol: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#090B12',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  tableRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  tableDim: { color: '#F5F5F7', fontSize: 12, fontWeight: '700' },
  primaryBtn: { backgroundColor: '#0052FF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryBtnText: { color: '#F5F5F7', fontSize: 12, fontWeight: '600' },
  btnDisabled: { opacity: 0.55 },
  successBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 10,
    padding: 10,
  },
  successBannerText: { color: '#34D399', fontSize: 12, fontWeight: '700' },
  alertBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  alertBannerTitle: { color: '#FCA5A5', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  alertBannerText: { color: '#FEE2E2', fontSize: 12, fontWeight: '700' },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    borderRadius: 10,
    padding: 10,
  },
  errorBannerText: { color: '#FCA5A5', fontSize: 12 },
  monoStrong: { color: '#F5F5F7', fontSize: 12, fontWeight: '700', fontFamily: MONO },
  monoMuted: { color: '#9CA3AF', fontSize: 11, fontFamily: MONO },
  mutedMeta: { color: '#9CA3AF', fontSize: 12 },
  mutedSmall: { color: '#9CA3AF', fontSize: 11, lineHeight: 16 },
  bodyCopy: { color: '#E5E7EB', fontSize: 12, lineHeight: 18 },
  stateTag: { fontSize: 11, fontWeight: '700', fontFamily: MONO },
  textGreen: { color: '#34D399', fontSize: 12, fontWeight: '700' },
  textAmber: { color: '#FBBF24', fontSize: 12, fontWeight: '700' },
  textBlue: { color: '#60A5FA', fontSize: 12, fontWeight: '700' },
  textRed: { color: '#F87171', fontSize: 12, fontWeight: '700' },
});
