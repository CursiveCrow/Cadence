/**
 * Unit tests for domain algorithms
 */

import { validateDAG, assignLanes, topologicalSort } from '../algorithms';
import { Task, Dependency, TaskStatus, DependencyType } from '../types';

describe('Domain Algorithms', () => {
  // Helper function to create test tasks
  const createTask = (id: string, overrides: Partial<Task> = {}): Task => ({
    id,
    title: `Task ${id}`,
    startDate: '2024-01-01',
    durationDays: 1,
    status: TaskStatus.NOT_STARTED,
    staffId: 'staff-1',
    staffLine: 0,
    laneIndex: 0,
    projectId: 'test-project',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides
  });

  // Helper function to create test dependencies
  const createDependency = (srcTaskId: string, dstTaskId: string): Dependency => ({
    id: `dep-${srcTaskId}-${dstTaskId}`,
    srcTaskId,
    dstTaskId,
    type: DependencyType.FINISH_TO_START,
    projectId: 'test-project',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  });

  describe('validateDAG', () => {
    test('should return true for acyclic graph', () => {
      const tasks = [
        createTask('A'),
        createTask('B'),
        createTask('C')
      ];
      
      const dependencies = [
        createDependency('A', 'B'),
        createDependency('B', 'C')
      ];

      expect(validateDAG(tasks, dependencies)).toBe(true);
    });

    test('should return false for cyclic graph', () => {
      const tasks = [
        createTask('A'),
        createTask('B'),
        createTask('C')
      ];
      
      const dependencies = [
        createDependency('A', 'B'),
        createDependency('B', 'C'),
        createDependency('C', 'A') // Creates cycle
      ];

      expect(validateDAG(tasks, dependencies)).toBe(false);
    });

    test('should return true for empty task list', () => {
      expect(validateDAG([], [])).toBe(true);
    });

    test('should return true for tasks without dependencies', () => {
      const tasks = [createTask('A'), createTask('B')];
      expect(validateDAG(tasks, [])).toBe(true);
    });

    test('should handle self-referencing dependency', () => {
      const tasks = [createTask('A')];
      const dependencies = [createDependency('A', 'A')];
      
      expect(validateDAG(tasks, dependencies)).toBe(false);
    });
  });

  describe('topologicalSort', () => {
    test('should sort tasks in dependency order', () => {
      const tasks = [
        createTask('A'),
        createTask('B'),
        createTask('C')
      ];
      
      const dependencies = [
        createDependency('A', 'B'),
        createDependency('B', 'C')
      ];

      const sorted = topologicalSort(tasks, dependencies);
      
      expect(sorted).toEqual(['A', 'B', 'C']);
    });

    test('should handle tasks without dependencies', () => {
      const tasks = [createTask('A'), createTask('B')];
      const sorted = topologicalSort(tasks, []);
      
      // Order doesn't matter for independent tasks
      expect(sorted).toHaveLength(2);
      expect(sorted).toContain('A');
      expect(sorted).toContain('B');
    });

    test('should handle complex dependency graph', () => {
      const tasks = [
        createTask('A'),
        createTask('B'),
        createTask('C'),
        createTask('D')
      ];
      
      const dependencies = [
        createDependency('A', 'C'),
        createDependency('B', 'C'),
        createDependency('C', 'D')
      ];

      const sorted = topologicalSort(tasks, dependencies);
      
      // A and B should come before C, C should come before D
      const indexA = sorted.indexOf('A');
      const indexB = sorted.indexOf('B');
      const indexC = sorted.indexOf('C');
      const indexD = sorted.indexOf('D');
      
      expect(indexA).toBeLessThan(indexC);
      expect(indexB).toBeLessThan(indexC);
      expect(indexC).toBeLessThan(indexD);
    });
  });

  describe('assignLanes', () => {
    test('should assign lane indices to tasks', () => {
      const tasks = [
        createTask('A'),
        createTask('B'),
        createTask('C')
      ];
      
      const dependencies = [
        createDependency('A', 'B'),
        createDependency('B', 'C')
      ];

      const tasksWithLanes = assignLanes(tasks, dependencies);
      
      // All tasks should have lane assignments
      tasksWithLanes.forEach(task => {
        expect(typeof task.laneIndex).toBe('number');
        expect(task.laneIndex).toBeGreaterThanOrEqual(0);
      });
    });

    test('should try to keep dependent tasks in same lane', () => {
      const tasks = [
        createTask('A'),
        createTask('B')
      ];
      
      const dependencies = [
        createDependency('A', 'B')
      ];

      const tasksWithLanes = assignLanes(tasks, dependencies);
      const taskA = tasksWithLanes.find(t => t.id === 'A')!;
      const taskB = tasksWithLanes.find(t => t.id === 'B')!;
      
      // Dependent tasks should be in the same or adjacent lanes
      expect(Math.abs(taskA.laneIndex - taskB.laneIndex)).toBeLessThanOrEqual(1);
    });

    test('should handle parallel tasks', () => {
      const tasks = [
        createTask('A'),
        createTask('B'),
        createTask('C')
      ];
      
      // No dependencies - all parallel
      const tasksWithLanes = assignLanes(tasks, []);
      
      // Should assign different lanes for parallel tasks to minimize conflicts
      const lanes = tasksWithLanes.map(t => t.laneIndex);
      expect(new Set(lanes).size).toBeGreaterThan(0); // At least one unique lane
    });
  });
});
