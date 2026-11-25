import { apiRequest } from './auth';

export interface DemoHealthData {
  status: string;
  service: string;
  port: string | number;
  ping: { ok: number } | null;
  version: string | null;
  readyState: number;
  readyStateLabel: string;
  replicaSet: string | null;
  replicaPrimary: string | null;
  members: { id: number; name: string; stateStr: string; health: number }[];
}

export interface ExplorerData {
  collection: string;
  totalDocuments: number;
  sampleCount: number;
  bsonTypeMap: Record<string, string[]>;
  indexes: { name: string; key: Record<string, number | string>; unique?: boolean; expireAfterSeconds?: number }[];
  samples: Record<string, unknown>[];
}

export interface ValidatorItem {
  collection: string;
  validationLevel: string | null;
  validationAction: string | null;
  validator: Record<string, unknown> | null;
  indexCount: number;
}

export interface ReplicaSetData {
  isReplicaSet: boolean;
  replicaSet: string | null;
  replicaPrimary: string | null;
  statusError: string | null;
  members: {
    id: number;
    name: string;
    stateStr: string;
    health: number;
    uptime: number;
    pingMs: number;
    syncSourceHost: string | null;
    optimeDate: string | null;
    electionTime: string | null;
    self: boolean;
  }[];
  oplog: {
    supported: boolean;
    reason: string | null;
    entries: {
      op: string;
      ns: string;
      wall: string | null;
      o2: Record<string, unknown> | null;
      o: Record<string, unknown> | null;
    }[];
  };
  killPrimaryInstructions: string[];
}

export interface WriteConcernTestData {
  iterations: number;
  w1: { label: string; totalMs: number; avgMs: number; opsPerSec: number; durability: string };
  wMajority: { label: string; totalMs: number; avgMs: number; opsPerSec: number; durability: string };
  overheadMs: number;
  overheadPct: number;
}

export interface ShardingShardStat {
  shard: string;
  host: string | null;
  storageStats: {
    count: number;
    size: number;
    avgObjSize: number;
    storageSize: number;
    totalIndexSize: number;
    nindexes: number;
  };
}

export interface ShardingDemoData {
  isShardedCluster: boolean;
  router: string;
  listShardsNote: string | null;
  shards: { _id: string; host: string; state: number }[];
  shardKeys: {
    attendance: {
      key: Record<string, number | string>;
      strategy: string;
      uniqueIndex: Record<string, number | string>;
    };
    notifications: {
      key: Record<string, number | string>;
      strategy: string;
    };
  };
  collections: {
    attendance: {
      totalDocs: number;
      perShard: ShardingShardStat[];
      chunks: { _id: string; chunkCount: number }[];
    };
    notifications: {
      totalDocs: number;
      perShard: ShardingShardStat[];
      chunks: { _id: string; chunkCount: number }[];
    };
  };
  writeHotspotExplanation: {
    whyDateKeyAloneHotspots: string;
    whyStudentIdPrefixFixesIt: string;
  };
}

export interface BenchmarkData {
  targetStudent: { _id: string; name: string; rollNo: string };
  totalCollectionDocs: number;
  methods: {
    id: string;
    label: string;
    stage: string;
    docsPulledIntoNode: number;
    totalDocsExamined: number;
    ms: number;
    result: { present: number; absent: number; marked: number; percentage: number | null };
  }[];
  replicationVsSharding: {
    replication: { goal: string; mechanism: string; dataScope: string; handles: string };
    sharding: { goal: string; mechanism: string; dataScope: string; handles: string };
  };
  asyncStorageVsMongoDB: {
    dimension: string;
    asyncStorage: string;
    mongoDB: string;
  }[];
}

export function fetchDemoHealth() {
  return apiRequest<DemoHealthData>('/demo/health');
}

export function fetchExplorerCollection(collection: string) {
  return apiRequest<ExplorerData>(`/admin/explorer/${encodeURIComponent(collection)}`);
}

export function fetchValidators() {
  return apiRequest<{ count: number; validators: ValidatorItem[] }>('/admin/validators');
}

export function fetchReplicaSetInfo() {
  return apiRequest<ReplicaSetData>('/demo/replica-set');
}

export function fetchOplog(limit = 20) {
  return apiRequest<{ count: number; entries: ReplicaSetData['oplog']['entries'] }>(
    `/demo/oplog?limit=${limit}`
  );
}

export function runWriteConcernBenchmark(iterations = 15) {
  return apiRequest<WriteConcernTestData>('/demo/write-concern-test', {
    method: 'POST',
    body: JSON.stringify({ iterations }),
  });
}

export function fetchShardingInfo() {
  return apiRequest<ShardingDemoData>('/demo/sharding');
}

export function fetchComparisonBenchmark(rollNo = '24CE002') {
  return apiRequest<BenchmarkData>(`/demo/benchmark?rollNo=${encodeURIComponent(rollNo)}`);
}

export function resetDemoDatabase() {
  return apiRequest<{ reset: boolean; elapsedMs: number; counts: Record<string, number> }>(
    '/demo/reset',
    { method: 'POST' }
  );
}
