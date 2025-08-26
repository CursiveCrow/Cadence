/**
 * Unit tests for CRDT mutations
 */

import { createTask, updateTask, deleteTask, createDependency } from '../mutations';
import { getProjectDoc, removeProjectDoc } from '../ydoc';
import { TaskStatus, DependencyType } from '@cadence/core';

describe('CRDT Mutations', () => {
  const testProjectId = 'test-project';
  
  afterEach(() => {
    // Clean up project documents after each test
    removeProjectDoc(testProjectId);
  });

  describe('createTask', () => {
    test('should create a new task in the YDoc', () => {
      const taskData = {
        id: 'task-1',
        title: 'Test Task',
        startDate: '2024-01-01',
        durationDays: 3,
        status: TaskStatus.NOT_STARTED,
        staffId: 'staff-1',
        staffLine: 0,
        laneIndex: 0,
        projectId: testProjectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      createTask(testProjectId, taskData);

      const ydoc = getProjectDoc(testProjectId);
      const task = ydoc.tasks.get('task-1');
      
      expect(task).toBeDefined();
      expect(task?.title).toBe('Test Task');
      expect(task?.durationDays).toBe(3);
    });

    test('should create multiple tasks without conflicts', () => {
      const task1 = {
        id: 'task-1',
        title: 'Task 1',
        startDate: '2024-01-01',
        durationDays: 1,
        status: TaskStatus.NOT_STARTED,
        staffId: 'staff-1',
        staffLine: 0,
        laneIndex: 0,
        projectId: testProjectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const task2 = {
        id: 'task-2',
        title: 'Task 2',
        startDate: '2024-01-02',
        durationDays: 2,
        status: TaskStatus.IN_PROGRESS,
        staffId: 'staff-1',
        staffLine: 1,
        laneIndex: 1,
        projectId: testProjectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      createTask(testProjectId, task1);
      createTask(testProjectId, task2);

      const ydoc = getProjectDoc(testProjectId);
      
      expect(ydoc.tasks.get('task-1')).toBeDefined();
      expect(ydoc.tasks.get('task-2')).toBeDefined();
      expect(ydoc.tasks.size).toBe(2);
    });
  });

  describe('updateTask', () => {
    beforeEach(() => {
      // Create a task to update
      createTask(testProjectId, {
        id: 'task-1',
        title: 'Original Title',
        startDate: '2024-01-01',
        durationDays: 1,
        status: TaskStatus.NOT_STARTED,
        staffId: 'staff-1',
        staffLine: 0,
        laneIndex: 0,
        projectId: testProjectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    test('should update existing task properties', () => {
      updateTask(testProjectId, 'task-1', {
        title: 'Updated Title',
        durationDays: 5
      });

      const ydoc = getProjectDoc(testProjectId);
      const task = ydoc.tasks.get('task-1');
      
      expect(task?.title).toBe('Updated Title');
      expect(task?.durationDays).toBe(5);
      expect(task?.startDate).toBe('2024-01-01'); // Unchanged
    });

    test('should handle partial updates', () => {
      updateTask(testProjectId, 'task-1', {
        status: TaskStatus.COMPLETED
      });

      const ydoc = getProjectDoc(testProjectId);
      const task = ydoc.tasks.get('task-1');
      
      expect(task?.status).toBe(TaskStatus.COMPLETED.toString());
      expect(task?.title).toBe('Original Title'); // Unchanged
    });

    test('should handle updates to non-existent task gracefully', () => {
      expect(() => {
        updateTask(testProjectId, 'non-existent', {
          title: 'Should not crash'
        });
      }).not.toThrow();

      const ydoc = getProjectDoc(testProjectId);
      expect(ydoc.tasks.get('non-existent')).toBeUndefined();
    });
  });

  describe('deleteTask', () => {
    beforeEach(() => {
      // Create tasks and dependencies for testing deletion
      createTask(testProjectId, {
        id: 'task-1',
        title: 'Task 1',
        startDate: '2024-01-01',
        durationDays: 1,
        status: TaskStatus.NOT_STARTED,
        staffId: 'staff-1',
        staffLine: 0,
        laneIndex: 0,
        projectId: testProjectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      createTask(testProjectId, {
        id: 'task-2',
        title: 'Task 2',
        startDate: '2024-01-02',
        durationDays: 1,
        status: TaskStatus.NOT_STARTED,
        staffId: 'staff-1',
        staffLine: 1,
        laneIndex: 0,
        projectId: testProjectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      createDependency(testProjectId, {
        id: 'dep-1',
        srcTaskId: 'task-1',
        dstTaskId: 'task-2',
        type: DependencyType.FINISH_TO_START,
        projectId: testProjectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    test('should delete task and its dependencies', () => {
      deleteTask(testProjectId, 'task-1');

      const ydoc = getProjectDoc(testProjectId);
      
      expect(ydoc.tasks.get('task-1')).toBeUndefined();
      expect(ydoc.tasks.get('task-2')).toBeDefined(); // Should remain
      expect(ydoc.dependencies.get('dep-1')).toBeUndefined(); // Should be deleted
    });

    test('should handle deletion of non-existent task', () => {
      expect(() => {
        deleteTask(testProjectId, 'non-existent');
      }).not.toThrow();
    });
  });

  describe('createDependency', () => {
    beforeEach(() => {
      // Create tasks for dependency testing
      createTask(testProjectId, {
        id: 'task-1',
        title: 'Task 1',
        startDate: '2024-01-01',
        durationDays: 1,
        status: TaskStatus.NOT_STARTED,
        staffId: 'staff-1',
        staffLine: 0,
        laneIndex: 0,
        projectId: testProjectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      createTask(testProjectId, {
        id: 'task-2',
        title: 'Task 2',
        startDate: '2024-01-02',
        durationDays: 1,
        status: TaskStatus.NOT_STARTED,
        staffId: 'staff-1',
        staffLine: 1,
        laneIndex: 0,
        projectId: testProjectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    test('should create dependency between tasks', () => {
      const depData = {
        id: 'dep-1',
        srcTaskId: 'task-1',
        dstTaskId: 'task-2',
        type: DependencyType.FINISH_TO_START,
        projectId: testProjectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      createDependency(testProjectId, depData);

      const ydoc = getProjectDoc(testProjectId);
      const dependency = ydoc.dependencies.get('dep-1');
      
      expect(dependency).toBeDefined();
      expect(dependency?.srcTaskId).toBe('task-1');
      expect(dependency?.dstTaskId).toBe('task-2');
      expect(dependency?.type).toBe(DependencyType.FINISH_TO_START);
    });

    test('should create multiple dependencies', () => {
      createDependency(testProjectId, {
        id: 'dep-1',
        srcTaskId: 'task-1',
        dstTaskId: 'task-2',
        type: DependencyType.FINISH_TO_START,
        projectId: testProjectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      createDependency(testProjectId, {
        id: 'dep-2',
        srcTaskId: 'task-2',
        dstTaskId: 'task-1', // Different direction
        type: DependencyType.START_TO_START,
        projectId: testProjectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const ydoc = getProjectDoc(testProjectId);
      
      expect(ydoc.dependencies.size).toBe(2);
      expect(ydoc.dependencies.get('dep-1')).toBeDefined();
      expect(ydoc.dependencies.get('dep-2')).toBeDefined();
    });
  });
});
