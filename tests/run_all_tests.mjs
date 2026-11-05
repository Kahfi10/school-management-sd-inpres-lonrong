import 'fake-indexeddb/auto';
import Dexie from 'dexie';

console.log('====================================================');
console.log('SD INPRES LONRONG - UNIFIED AUTOMATED TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  [PASS]: ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL]: ${testName}`);
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
// 6. Single Super Admin & Teacher Account Governance Tests
// -----------------------------------------------------------------
console.log('\n--- 6. Testing Single Super Admin & User Governance ---');

const testUserDb = new Dexie('LonrongUserTestDB');
testUserDb.version(1).stores({
  users: 'id, &username, role, pinCode, pegawaiId',
});

// Seed Initial Single Super Admin
await testUserDb.users.add({
  id: 'usr-superadmin',
  username: 'admin',
  passwordHash: (await hashPassword('admin123')).hash,
  role: 'admin',
  isSuperAdmin: true,
  pinCode: '1234',
  namaLengkap: 'Drs. H. Syamsuddin, M.Pd.',
});

let currentUser = { id: 'usr-superadmin', username: 'admin', role: 'admin', isSuperAdmin: true };

function isSuperAdminUser(user) {
  return user?.isSuperAdmin === true || (user?.role === 'admin' && user?.username === 'admin');
}

async function createUserSimulated(actor, data) {
  if (!isSuperAdminUser(actor)) {
    return { success: false, message: 'Akses ditolak: Hanya Super Admin yang berhak membuat akun baru.' };
  }
  if (data.role === 'admin') {
    return { success: false, message: 'Ditolak: Sistem hanya mengizinkan 1 Super Admin utama di sekolah.' };
  }
  const cleanUsername = data.username.trim().toLowerCase();
  const existing = await testUserDb.users.where('username').equals(cleanUsername).first();
  if (existing) {
    return { success: false, message: 'Username sudah digunakan' };
  }
  const existingPin = await testUserDb.users.where('pinCode').equals(data.pinCode).first();
  if (existingPin) {
    return { success: false, message: 'PIN sudah digunakan' };
  }

  const hashedPassword = (await hashPassword(data.password)).hash;
  const newUser = {
    id: `usr-${Date.now()}`,
    username: cleanUsername,
    passwordHash: hashedPassword,
    role: data.role,
    isSuperAdmin: false,
    pinCode: data.pinCode,
    namaLengkap: data.namaLengkap,
  };
  await testUserDb.users.add(newUser);
  return { success: true, user: newUser };
}

async function deleteUserSimulated(actor, targetId) {
  if (!isSuperAdminUser(actor)) {
    return { success: false, message: 'Akses ditolak' };
  }
  const target = await testUserDb.users.get(targetId);
  if (!target) return { success: false, message: 'User not found' };
  if (target.isSuperAdmin || target.username === 'admin') {
    return { success: false, message: 'Proteksi: Akun Super Admin utama tidak dapat dihapus!' };
  }
  await testUserDb.users.delete(targetId);
  return { success: true };
}

// 1. Non-superadmin cannot create users
const nonSuperRes = await createUserSimulated({ id: 'usr-guru', role: 'guru' }, { username: 'guru2', role: 'guru', password: '123', pinCode: '2222', namaLengkap: 'Guru' });
assert(!nonSuperRes.success && nonSuperRes.message.includes('Akses ditolak'), 'Non-superadmin is blocked from creating accounts');

// 2. Cannot create a second admin
const secondAdminRes = await createUserSimulated(currentUser, { username: 'admin2', role: 'admin', password: 'password123', pinCode: '5555', namaLengkap: 'Admin 2' });
assert(!secondAdminRes.success && secondAdminRes.message.includes('1 Super Admin'), 'Creation of secondary admin is blocked (Strict 1 Super Admin Policy)');

// 3. Super Admin creates teacher account
const createTeacherRes = await createUserSimulated(currentUser, { username: 'rahmah', role: 'guru', password: 'password123', pinCode: '3456', namaLengkap: 'Sitti Rahmah, S.Pd.' });
assert(createTeacherRes.success && createTeacherRes.user.passwordHash.length === 64, 'Super admin successfully provisions teacher account with PBKDF2 hash');

// 4. Duplicate username rejected
const dupUserRes = await createUserSimulated(currentUser, { username: 'rahmah', role: 'guru', password: 'password123', pinCode: '9999', namaLengkap: 'Rahmah 2' });
assert(!dupUserRes.success && dupUserRes.message.includes('Username sudah digunakan'), 'Duplicate username creation is strictly rejected');

// 5. Duplicate PIN rejected
const dupPinRes = await createUserSimulated(currentUser, { username: 'guru_baru', role: 'guru', password: 'password123', pinCode: '3456', namaLengkap: 'Guru Baru' });
assert(!dupPinRes.success && dupPinRes.message.includes('PIN sudah digunakan'), 'Duplicate PIN creation is strictly rejected');

// 6. Super Admin account is undeletable
const deleteAdminRes = await deleteUserSimulated(currentUser, 'usr-superadmin');
assert(!deleteAdminRes.success && deleteAdminRes.message.includes('Proteksi'), 'Super Admin account is permanently undeletable');

// 7. Super Admin deletes teacher account
const deleteTeacherRes = await deleteUserSimulated(currentUser, createTeacherRes.user.id);
assert(deleteTeacherRes.success, 'Super Admin successfully deprovisions teacher account');

await testUserDb.delete();

// -----------------------------------------------------------------
// 7. Field-Level 3-Way Delta Conflict Resolver Tests
// -----------------------------------------------------------------
console.log('\n--- 7. Testing Field-Level 3-Way Delta Conflict Resolver ---');

function mergeFieldLevelTest(localRecord, remoteRecord, pendingOutboxPayload) {
  if (!localRecord) {
    return { merged: { ...remoteRecord }, conflictsResolved: 0 };
  }
  const merged = { ...localRecord, ...remoteRecord };
  let conflictsResolved = 0;

  if (pendingOutboxPayload && typeof pendingOutboxPayload === 'object') {
    for (const [key, pendingVal] of Object.entries(pendingOutboxPayload)) {
      if (pendingVal !== undefined && pendingVal !== null && key !== 'id') {
        if (remoteRecord[key] !== pendingVal) {
          merged[key] = pendingVal;
          conflictsResolved++;
        }
      }
    }
  }

  const localTime = new Date(localRecord.updatedAt || 0).getTime();
  const remoteTime = new Date(remoteRecord.updatedAt || 0).getTime();
  if (localTime > remoteTime) {
    merged.updatedAt = localRecord.updatedAt;
  }
  return { merged, conflictsResolved };
}

// Case A: No local record -> adopt remote
const resA = mergeFieldLevelTest(undefined, { id: 's1', nama: 'Budi', alamat: 'Lonrong' });
assert(resA.merged.nama === 'Budi' && resA.conflictsResolved === 0, 'Adopts remote when no local record exists');

// Case B: Local teacher edited alamat offline, remote updated nama -> merge both fields seamlessly!
const localRecordB = { id: 's1', nama: 'Budi Lama', alamat: 'Lonrong Baru', updatedAt: '2026-10-22T10:00:00Z' };
const remoteRecordB = { id: 's1', nama: 'Budi Updated', alamat: 'Lonrong Lama', updatedAt: '2026-10-22T11:00:00Z' };
const pendingOutboxB = { alamat: 'Lonrong Baru' }; // Teacher actively modified alamat

const resB = mergeFieldLevelTest(localRecordB, remoteRecordB, pendingOutboxB);
assert(resB.merged.nama === 'Budi Updated' && resB.merged.alamat === 'Lonrong Baru', 'Preserves local pending field while integrating non-conflicting remote field');
assert(resB.conflictsResolved === 1, 'Field-level conflict accurately detected and resolved');

// -----------------------------------------------------------------
// 8. Native Stream Gzip Compression & Decompression Tests
// -----------------------------------------------------------------
console.log('\n--- 8. Testing Native Gzip Stream Compression ---');

async function testCompressGzip(rawString) {
  const byteArray = new TextEncoder().encode(rawString);
  if (typeof CompressionStream !== 'undefined') {
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    writer.write(byteArray);
    writer.close();
    const outputChunks = [];
    const reader = cs.readable.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) outputChunks.push(value);
    }
    const totalLength = outputChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of outputChunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
  return byteArray;
}

async function testDecompressGzip(compressedBytes) {
  if (typeof DecompressionStream !== 'undefined') {
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(compressedBytes);
    writer.close();
    const outputChunks = [];
    const reader = ds.readable.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) outputChunks.push(value);
    }
    const totalLength = outputChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of outputChunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return new TextDecoder().decode(result);
  }
  return new TextDecoder().decode(compressedBytes);
}

const originalJson = JSON.stringify({ school: 'SD Inpres Lonrong', npsn: '40304087', students: 135, active: true });
const compressed = await testCompressGzip(originalJson);
assert(compressed instanceof Uint8Array && compressed.length > 0, 'Stream Gzip successfully produces compressed byte buffer');
const decompressed = await testDecompressGzip(compressed);
assert(decompressed === originalJson, 'Decompression accurately reconstructs original school JSON payload');

// -----------------------------------------------------------------
// 9. Blob Storage Garbage Collector & Orphan Pruning Tests
// -----------------------------------------------------------------
console.log('\n--- 9. Testing Blob Garbage Collector & Orphan Pruning ---');

const testGcDb = new Dexie('LonrongGcTestDB');
testGcDb.version(1).stores({
  bukuTamu: 'id, tandaTanganBlobId',
  mediaBlobs: 'id',
});

// Seed 1 active guestbook entry with 1 valid blob
await testGcDb.bukuTamu.add({ id: 'tamu_01', tandaTanganBlobId: 'blob_active_01' });
// Seed 3 blobs (1 active, 2 orphans)
await testGcDb.mediaBlobs.bulkAdd([
  { id: 'blob_active_01', base64Data: 'data:image/png;base64,activeSignature' },
  { id: 'blob_orphan_01', base64Data: 'data:image/png;base64,orphan1' },
  { id: 'blob_orphan_02', base64Data: 'data:image/png;base64,orphan2' },
]);

// Run GC simulation
const activeRefs = new Set((await testGcDb.bukuTamu.toArray()).map((t) => t.tandaTanganBlobId).filter(Boolean));
const allBlobsBefore = await testGcDb.mediaBlobs.toArray();
const orphans = allBlobsBefore.filter((b) => !activeRefs.has(b.id)).map((b) => b.id);
await testGcDb.mediaBlobs.bulkDelete(orphans);

const blobsAfter = await testGcDb.mediaBlobs.toArray();
assert(orphans.length === 2, 'Garbage collector accurately identifies exact 2 orphaned blobs');
assert(blobsAfter.length === 1 && blobsAfter[0].id === 'blob_active_01', 'Active referenced signature is preserved while orphans are purged');

await testGcDb.delete();

// -----------------------------------------------------------------
// 10. High-Load Distributed Stress & Memory Leak Audit
// -----------------------------------------------------------------
console.log('\n--- 10. Testing Distributed High-Load Stress & Memory Integrity ---');

const stressQueue = [];
const startStressTime = Date.now();

for (let i = 0; i < 300; i++) {
  const studentIndex = i % 10;
  compactOutbox(stressQueue, {
    id: `stress_${i}`,
    tableName: 'siswa',
    recordId: `stu_${studentIndex}`,
    action: i === 0 ? 'create' : 'update',
    payloadJson: JSON.stringify({
      updateCount: i,
      lastModifiedBy: `guru_${i % 5}`,
      timestamp: Date.now(),
    }),
    status: 'pending',
  });
}

const stressDuration = Date.now() - startStressTime;
assert(stressQueue.length === 10, 'Outbox compaction coalesces 300 rapid updates into exact 10 records');
assert(stressDuration < 100, `High-load stress processing executed in under 100ms (${stressDuration}ms)`);

const finalRecord = JSON.parse(stressQueue[0].payloadJson);
assert(finalRecord.updateCount === 290, 'Latest payload state is preserved under high-frequency writes');

// -----------------------------------------------------------------
// 11. User Management Anti-Collision & Supabase Payload Sanitization
// -----------------------------------------------------------------
console.log('\n--- 11. Testing User Management Anti-Collision & Supabase Sanitization ---');

function generateUniquePinTest(existingUsers) {
  const existingPins = new Set(existingUsers.map((u) => u.pinCode.trim()));
  for (let i = 0; i < 500; i++) {
    const candidate = Math.floor(1000 + Math.random() * 9000).toString();
    if (!existingPins.has(candidate)) {
      return candidate;
    }
  }
  return '7891';
}

const mockExistingUsers = [
  { pinCode: '1234' }, // Super Admin
  { pinCode: '2345' }, // Operator
  { pinCode: '3456' }, // Guru
];

const generatedPin = generateUniquePinTest(mockExistingUsers);
assert(/^\d{4}$/.test(generatedPin), 'Generated PIN is exactly 4 numeric digits');
assert(!['1234', '2345', '3456'].includes(generatedPin), 'Generated PIN strictly avoids existing user PIN collisions');

// Test Supabase allowed columns and sanitization logic
const SUPABASE_ALLOWED_COLUMNS_TEST = {
  users: [
    'id', 'username', 'passwordHash', 'role', 'isSuperAdmin', 'isActive',
    'pinCode', 'namaLengkap', 'nipNuptk', 'pegawaiId', 'lastLogin', 'updatedAt'
  ],
};

function sanitizeSupabasePayloadTest(tableName, record) {
  if (!record || typeof record !== 'object') return record;
  const allowedCols = SUPABASE_ALLOWED_COLUMNS_TEST[tableName];
  if (!allowedCols) {
    const clean = { ...record };
    delete clean.createdAt;
    return clean;
  }
  const sanitized = {};
  for (const col of allowedCols) {
    if (record[col] !== undefined) {
      sanitized[col] = record[col];
    }
  }
  if (record.id && !sanitized.id) {
    sanitized.id = record.id;
  }
  return sanitized;
}

const rawUserPayload = {
  id: 'usr_test_1',
  username: 'gurutest',
  passwordHash: 'hash123',
  role: 'guru',
  isSuperAdmin: false,
  isActive: true,
  pinCode: '5678',
  namaLengkap: 'Guru Penguji',
  nipNuptk: '19850101 201001 1 001',
  createdAt: '2026-11-05T00:00:00.000Z', // Client-only property, absent from Supabase
  __dexieInternal: 'metadata',
};

const sanitizedUser = sanitizeSupabasePayloadTest('users', rawUserPayload);
assert(sanitizedUser.id === 'usr_test_1', 'Sanitized payload maintains primary key id');
assert(sanitizedUser.username === 'gurutest' && sanitizedUser.pinCode === '5678', 'Sanitized payload retains all required schema columns');
assert(sanitizedUser.createdAt === undefined, 'Client-only createdAt property is cleanly stripped to prevent Supabase 400');
assert(sanitizedUser.__dexieInternal === undefined, 'Non-schema metadata properties are stripped');

// Test Dexie update full-record enrichment simulation
const originalUserInDb = {
  id: 'usr_tendik',
  username: 'tendik',
  namaLengkap: 'Andi Nurul Qalbi, S.Kom.',
  role: 'tendik',
  passwordHash: 'oldhash',
  pinCode: '2345',
  nipNuptk: '19950814 202203 2 005',
};

const partialModification = {
  passwordHash: 'newSecureHash',
  pinCode: '8899',
  updatedAt: '2026-11-05T02:00:00.000Z',
};

// Merged full record
const enrichedPayload = { ...originalUserInDb, ...partialModification, id: 'usr_tendik' };
const sanitizedEnriched = sanitizeSupabasePayloadTest('users', enrichedPayload);

assert(sanitizedEnriched.id === 'usr_tendik', 'Enriched update payload preserves record ID');
assert(sanitizedEnriched.username === 'tendik', 'Enriched update payload includes mandatory username column');
assert(sanitizedEnriched.namaLengkap === 'Andi Nurul Qalbi, S.Kom.', 'Enriched update payload includes mandatory namaLengkap column');
assert(sanitizedEnriched.pinCode === '8899' && sanitizedEnriched.passwordHash === 'newSecureHash', 'Enriched update contains updated credentials');

// -----------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------
console.log('\n====================================================');
console.log(`FINAL TEST REPORT: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('====================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
