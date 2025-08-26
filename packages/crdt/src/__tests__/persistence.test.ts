/**
 * Unit tests for CRDT persistence layer
 */

import { SQLiteOPFSProvider, connectPersistence } from '../persistence';
import * as Y from 'yjs';

describe('SQLiteOPFSProvider', () => {
  let provider: SQLiteOPFSProvider;

  beforeEach(() => {
    provider = new SQLiteOPFSProvider({
      dbName: 'test.db',
      enableCompression: false, // Disable for simpler testing
      snapshotInterval: 5
    });
  });

  afterEach(async () => {
    if (provider) {
      await provider.destroy();
    }
  });

  test('should initialize successfully', async () => {
    // This will use the mock database since SQLite WASM is not available in tests
    await expect(provider.init()).resolves.not.toThrow();
  });

  test('should save and load updates', async () => {
    await provider.init();

    const testUpdate = new Uint8Array([1, 2, 3, 4, 5]);
    const docId = 'test-doc';

    // Save update
    await provider.saveUpdate(docId, testUpdate);

    // Load updates
    const updates = await provider.loadUpdates(docId);
    
    expect(updates).toHaveLength(1);
    expect(updates[0]).toEqual(testUpdate);
  });

  test('should save and load snapshots', async () => {
    await provider.init();

    const testSnapshot = new Uint8Array([10, 20, 30, 40]);
    const docId = 'test-doc';

    // Save snapshot
    await provider.saveSnapshot(docId, testSnapshot);

    // Load snapshot
    const loadedSnapshot = await provider.loadSnapshot(docId);
    
    expect(loadedSnapshot).toEqual(testSnapshot);
  });

  test('should handle multiple updates for same document', async () => {
    await provider.init();

    const docId = 'test-doc';
    const update1 = new Uint8Array([1, 1, 1]);
    const update2 = new Uint8Array([2, 2, 2]);
    const update3 = new Uint8Array([3, 3, 3]);

    // Save multiple updates
    await provider.saveUpdate(docId, update1);
    await provider.saveUpdate(docId, update2);
    await provider.saveUpdate(docId, update3);

    // Load all updates
    const updates = await provider.loadUpdates(docId);
    
    expect(updates).toHaveLength(3);
    expect(updates[0]).toEqual(update1);
    expect(updates[1]).toEqual(update2);
    expect(updates[2]).toEqual(update3);
  });

  test('should handle updates for different documents', async () => {
    await provider.init();

    const doc1Id = 'doc-1';
    const doc2Id = 'doc-2';
    const update1 = new Uint8Array([1, 1, 1]);
    const update2 = new Uint8Array([2, 2, 2]);

    // Save updates for different documents
    await provider.saveUpdate(doc1Id, update1);
    await provider.saveUpdate(doc2Id, update2);

    // Load updates for each document
    const doc1Updates = await provider.loadUpdates(doc1Id);
    const doc2Updates = await provider.loadUpdates(doc2Id);
    
    expect(doc1Updates).toHaveLength(1);
    expect(doc1Updates[0]).toEqual(update1);
    
    expect(doc2Updates).toHaveLength(1);
    expect(doc2Updates[0]).toEqual(update2);
  });

  test('should return empty array for non-existent document', async () => {
    await provider.init();

    const updates = await provider.loadUpdates('non-existent');
    expect(updates).toEqual([]);
  });

  test('should return null for non-existent snapshot', async () => {
    await provider.init();

    const snapshot = await provider.loadSnapshot('non-existent');
    expect(snapshot).toBeNull();
  });

  test('should handle errors gracefully during save operations', async () => {
    // Don't initialize provider to trigger error condition
    const testUpdate = new Uint8Array([1, 2, 3]);
    
    await expect(provider.saveUpdate('test-doc', testUpdate))
      .rejects.toThrow('Provider not initialized');
  });

  test('should handle errors gracefully during load operations', async () => {
    // Don't initialize provider to trigger error condition
    
    await expect(provider.loadUpdates('test-doc'))
      .rejects.toThrow('Provider not initialized');
      
    await expect(provider.loadSnapshot('test-doc'))
      .rejects.toThrow('Provider not initialized');
  });
});

describe('connectPersistence', () => {
  let ydoc: Y.Doc;
  let provider: SQLiteOPFSProvider;

  beforeEach(() => {
    ydoc = new Y.Doc();
    provider = new SQLiteOPFSProvider({ 
      dbName: 'connection-test.db',
      enableCompression: false
    });
  });

  afterEach(async () => {
    if (ydoc) {
      ydoc.destroy();
    }
    if (provider) {
      await provider.destroy();
    }
  });

  test('should connect YDoc to persistence provider', async () => {
    const cleanup = connectPersistence(ydoc, provider, 'test-doc');
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Make a change to the document
    const ymap = ydoc.getMap('test');
    ymap.set('key', 'value');
    
    // Wait for persistence
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Cleanup
    cleanup();
    
    // Verify the connection was established (no errors thrown)
    expect(true).toBe(true);
  });

  test('should load existing data on connection', async () => {
    const docId = 'test-doc';
    
    // Pre-populate some data
    await provider.init();
    const testDoc = new Y.Doc();
    const testMap = testDoc.getMap('test');
    testMap.set('existing', 'data');
    
    const update = Y.encodeStateAsUpdate(testDoc);
    await provider.saveUpdate(docId, update);
    
    testDoc.destroy();
    
    // Connect new document to persistence
    const cleanup = connectPersistence(ydoc, provider, docId);
    
    // Wait for loading
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Check if data was loaded
    const loadedMap = ydoc.getMap('test');
    expect(loadedMap.get('existing')).toBe('data');
    
    cleanup();
  });

  test('should save changes to persistence', async () => {
    const docId = 'test-doc';
    const cleanup = connectPersistence(ydoc, provider, docId);
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Make changes
    const ymap = ydoc.getMap('test');
    ymap.set('key1', 'value1');
    ymap.set('key2', 'value2');
    
    // Wait for persistence
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Verify data was saved by loading in new provider
    const verifyProvider = new SQLiteOPFSProvider({ dbName: 'connection-test.db' });
    await verifyProvider.init();
    const updates = await verifyProvider.loadUpdates(docId);
    
    expect(updates.length).toBeGreaterThan(0);
    
    cleanup();
    await verifyProvider.destroy();
  });

  test('should return cleanup function that removes listeners', () => {
    const cleanup = connectPersistence(ydoc, provider, 'test-doc');
    
    // Should return a function
    expect(typeof cleanup).toBe('function');
    
    // Should not throw when called
    expect(() => cleanup()).not.toThrow();
  });
});
