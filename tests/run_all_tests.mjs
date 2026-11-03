import 'fake-indexeddb/auto';
import Dexie from 'dexie';

console.log('====================================================');
console.log('🧪 SD INPRES LONRONG - UNIFIED AUTOMATED TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failedTests++;
  }
}

// -----------------------------------------------------------------
// 1. PBKDF2 Web Crypto & LRU Cache Tests
// -----------------------------------------------------------------
console.log('--- 1. Testing Cryptographic PBKDF2 & Hash Cache ---');
const passwordHashCache = new Map();

async function hashPassword(password, salt = 'sd_inpres_lonrong_salt_2026') {
  const cacheKey = `${password}:${salt}`;
  if (passwordHashCache.has(cacheKey)) {
    return { hash: passwordHashCache.get(cacheKey), cached: true };
  }

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password + salt),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    true,
    ['sign']
  );

  const rawKey = await crypto.subtle.exportKey('raw', key);
  const hashArray = Array.from(new Uint8Array(rawKey));
  const result = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  passwordHashCache.set(cacheKey, result);
  return { hash: result, cached: false };
}

const h1 = await hashPassword('admin123');
assert(!h1.cached && h1.hash.length === 64, 'PBKDF2 SHA-256 generates valid 64-character hex hash');
const h2 = await hashPassword('admin123');
assert(h2.cached === true && h2.hash === h1.hash, 'Hash cache resolves repeat passwords instantly');

// -----------------------------------------------------------------
// 2. Outbox Compaction (Coalescing) Tests
// -----------------------------------------------------------------
console.log('\n--- 2. Testing Outbox Coalescing & Compaction Logic ---');
function compactOutbox(outboxQueue, newItem) {
  const idx = outboxQueue.findIndex(
    (it) => it.tableName === newItem.tableName && it.recordId === newItem.recordId && it.status === 'pending'
  );

  if (idx === -1) {
    outboxQueue.push(newItem);
    return;
  }

  const existing = outboxQueue[idx];
  if (existing.action === 'create') {
    if (newItem.action === 'update') {
      const merged = { ...JSON.parse(existing.payloadJson || '{}'), ...JSON.parse(newItem.payloadJson || '{}') };
      existing.payloadJson = JSON.stringify(merged);
      existing.timestamp = Date.now();
    } else if (newItem.action === 'delete') {
      outboxQueue.splice(idx, 1);
    }
  } else if (existing.action === 'update') {
    if (newItem.action === 'update') {
      const merged = { ...JSON.parse(existing.payloadJson || '{}'), ...JSON.parse(newItem.payloadJson || '{}') };
      existing.payloadJson = JSON.stringify(merged);
      existing.timestamp = Date.now();
    } else if (newItem.action === 'delete') {
      existing.action = 'delete';
      existing.payloadJson = '{}';
    }
  }
}

const queueA = [];
compactOutbox(queueA, { id: '1', tableName: 'siswa', recordId: 's1', action: 'create', payloadJson: JSON.stringify({ nama: 'Budi', kelas: 1 }), status: 'pending' });
compactOutbox(queueA, { id: '2', tableName: 'siswa', recordId: 's1', action: 'update', payloadJson: JSON.stringify({ kelas: 2, alamat: 'Lonrong' }), status: 'pending' });
assert(queueA.length === 1, 'create + update compacts to 1 single outbox item');
assert(JSON.parse(queueA[0].payloadJson).kelas === 2, 'Compacted payload maintains newest updated fields');

const queueB = [];
compactOutbox(queueB, { id: '1', tableName: 'siswa', recordId: 's2', action: 'create', payloadJson: '{}', status: 'pending' });
compactOutbox(queueB, { id: '2', tableName: 'siswa', recordId: 's2', action: 'delete', payloadJson: '{}', status: 'pending' });
assert(queueB.length === 0, 'create + delete offline purges record from outbox');

// -----------------------------------------------------------------
// 3. Batch Upsert Payload Partitioning Tests
// -----------------------------------------------------------------
console.log('\n--- 3. Testing Batch Upsert Grouping Logic ---');
function prepareBatchPayloads(items) {
  const tableMap = new Map();
  for (const item of items) {
    const list = tableMap.get(item.tableName) || [];
    list.push(item);
    tableMap.set(item.tableName, list);
  }

  const results = {};
  for (const [tableName, tableItems] of tableMap.entries()) {
    const upsertItems = tableItems.filter((i) => i.action !== 'delete');
    const deleteItems = tableItems.filter((i) => i.action === 'delete');

    const collapsedMap = new Map();
    for (const it of upsertItems) {
      const parsed = JSON.parse(it.payloadJson || '{}');
      const existing = collapsedMap.get(it.recordId);
      if (existing) {
        existing.payload = { ...existing.payload, ...parsed };
        existing.itemIds.push(it.id);
      } else {
        collapsedMap.set(it.recordId, { payload: parsed, itemIds: [it.id] });
      }
    }

    results[tableName] = {
      upsertPayloads: Array.from(collapsedMap.values()).map((v) => v.payload),
      deleteIds: deleteItems.map((d) => d.recordId),
    };
  }
  return results;
}

const rawItems = [
  { id: '1', tableName: 'siswa', recordId: 's1', action: 'create', payloadJson: JSON.stringify({ id: 's1', nama: 'Ahmad' }) },
  { id: '2', tableName: 'siswa', recordId: 's2', action: 'create', payloadJson: JSON.stringify({ id: 's2', nama: 'Fatimah' }) },
  { id: '3', tableName: 'siswa', recordId: 's3', action: 'delete', payloadJson: '{}' },
  { id: '4', tableName: 'pegawai', recordId: 'p1', action: 'create', payloadJson: JSON.stringify({ id: 'p1', nama: 'Guru 1' }) },
];

const batchResult = prepareBatchPayloads(rawItems);
assert(batchResult['siswa'].upsertPayloads.length === 2, 'Batch groups 2 student upserts into 1 bulk array');
assert(batchResult['siswa'].deleteIds.length === 1, 'Batch groups delete IDs correctly');
assert(batchResult['pegawai'].upsertPayloads.length === 1, 'Batch isolates pegawai table correctly');

// -----------------------------------------------------------------
// 4. Dexie Database Schema Version 2 & Silent Pull Guard
// -----------------------------------------------------------------
console.log('\n--- 4. Testing Dexie DB Schema Version 2 & Silent Pull Guard ---');
class LonrongTestDatabase extends Dexie {
  constructor() {
    super('LonrongIntegratedTestDB');
    this.version(2).stores({
      users: 'id, username, role, pinCode',
      pegawai: 'id, nipNuptk, namaLengkap, jabatan, statusKepegawaian, syncStatus, updatedAt',
      kelasRombel: 'id, tingkat, namaRombel, fase',
      siswa: 'id, [statusSiswa+tingkatKelas], nisn, nik, namaLengkap, rombelId, tingkatKelas, statusSiswa, syncStatus, updatedAt',
      mutasiSiswa: 'id, siswaId, jenisMutasi, tanggalMutasi, syncStatus',
      bebanAjar: 'id, pegawaiId, rombelId, mataPelajaran, syncStatus',
      arsipDigital: 'id, pegawaiId, kategori, driveFileId, syncStatus',
      sarpras: 'id, kodeAset, kategoriKib, namaBarang, kondisi, lokasiRuang, syncStatus, updatedAt',
      jurnalKinerja: 'id, pegawaiId, tanggal, statusVerifikasi, syncStatus, updatedAt',
      bukuTamu: 'id, tanggalKunjungan, namaTamu, kategoriTamu, syncStatus',
      syncOutbox: 'id, tableName, recordId, action, status, timestamp',
      mediaBlobs: 'id, recordId, mimeType, createdAt',
    });

    this.isSeeding = false;
    this.isSyncPulling = false;
    this.hookCalls = [];

    this.setupHooks();
  }

  setupHooks() {
    this.siswa.hook('creating', (primKey, obj) => {
      if (this.isSeeding || this.isSyncPulling) return;
      this.hookCalls.push({ type: 'create', id: primKey || obj.id });
    });
  }
}

const testDb = new LonrongTestDatabase();
await testDb.open();
assert(testDb.isOpen(), 'LonrongTestDatabase opened with Dexie version 2 schema');

// Test normal creation triggers hook
await testDb.siswa.add({
  id: 's_test_1',
  nisn: '001',
  nik: '7303001',
  namaLengkap: 'Siswa Test 1',
  tingkatKelas: 5,
  statusSiswa: 'aktif',
  syncStatus: 'pending',
  updatedAt: new Date().toISOString(),
});
assert(testDb.hookCalls.length === 1, 'Normal student insert triggers mutation hook');

// Test Silent Pull Guard prevents hook triggering
testDb.hookCalls = [];
testDb.isSyncPulling = true;
await testDb.siswa.bulkPut([
  { id: 's_test_2', nisn: '002', nik: '7303002', namaLengkap: 'Siswa Test 2', tingkatKelas: 5, statusSiswa: 'aktif', syncStatus: 'synced', updatedAt: new Date().toISOString() },
  { id: 's_test_3', nisn: '003', nik: '7303003', namaLengkap: 'Siswa Test 3', tingkatKelas: 6, statusSiswa: 'aktif', syncStatus: 'synced', updatedAt: new Date().toISOString() },
]);
testDb.isSyncPulling = false;
assert(testDb.hookCalls.length === 0, 'Silent Pull Guard: 0 hooks fired during bulkPut (Infinite loop prevented!)');

// Test compound index query
const class5 = await testDb.siswa.where('[statusSiswa+tingkatKelas]').equals(['aktif', 5]).toArray();
assert(class5.length === 2, 'Compound index [statusSiswa+tingkatKelas] returns exact 2 active Class 5 students');

// Test mediaBlobs table
await testDb.mediaBlobs.put({
  id: 'blob_sig_test',
  recordId: 'btm_test',
  mimeType: 'image/png',
  dataBase64: 'data:image/png;base64,mock',
  createdAt: new Date().toISOString(),
});
const savedBlob = await testDb.mediaBlobs.get('blob_sig_test');
assert(savedBlob && savedBlob.recordId === 'btm_test', 'Media blob record stored and retrieved successfully');

await testDb.delete();

// -----------------------------------------------------------------
// 5. Cross-Tab Message Deduplication Engine
// -----------------------------------------------------------------
console.log('\n--- 5. Testing Cross-Tab Deduplication & Message Handlers ---');
const handledIds = new Set();
function isMessageAlreadyHandled(msgId) {
  if (!msgId) return false;
  if (handledIds.has(msgId)) return true;
  handledIds.add(msgId);
  if (handledIds.size > 200) {
    const oldest = handledIds.values().next().value;
    if (oldest) handledIds.delete(oldest);
  }
  return false;
}

assert(!isMessageAlreadyHandled('msg_001'), 'Initial cross-tab message is accepted');
assert(isMessageAlreadyHandled('msg_001'), 'Duplicate message delivery is dropped');
assert(!isMessageAlreadyHandled('msg_002'), 'Subsequent message msg_002 is accepted');

// -----------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------
console.log('\n====================================================');
console.log(`📊 FINAL TEST REPORT: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('====================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
