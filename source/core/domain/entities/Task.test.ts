/**
 * Task Entity Tests
 * Using Bun's built-in test runner
 */

import { describe, it, expect, beforeEach } from "bun:test"
import { Task } from './Task'
import { TaskStatus } from '../value-objects/TaskStatus'
import { PerformanceTimer } from '../../../test-setup'

describe('Task Entity', () => {
    let task: Task

    beforeEach(() => {
        task = Task.create({
            id: 'task-1',
            title: 'Test Task',
            startDate: '2024-01-01',
            durationDays: 5,
            status: TaskStatus.NOT_STARTED,
            staffId: 'staff-1',
            staffLine: 2,
            projectId: 'project-1'
        })
    })

    describe('creation', () => {
        it('should create a task with provided properties', () => {
            expect(task.id).toBe('task-1')
            expect(task.title).toBe('Test Task')
            expect(task.startDate).toBe('2024-01-01')
            expect(task.durationDays).toBe(5)
            expect(task.status).toBe(TaskStatus.NOT_STARTED)
        })

        it('should set createdAt and updatedAt timestamps', () => {
            expect(task.createdAt).toBeDefined()
            expect(task.updatedAt).toBeDefined()
            expect(new Date(task.createdAt).getTime()).toBeLessThanOrEqual(Date.now())
        })

        it('should calculate end date correctly', () => {
            expect(task.endDate).toBe('2024-01-06')
        })
    })

    describe('status transitions', () => {
        it('should allow valid status transitions', () => {
            expect(task.canTransitionTo(TaskStatus.IN_PROGRESS)).toBe(true)
            expect(task.canTransitionTo(TaskStatus.COMPLETED)).toBe(true)
            expect(task.canTransitionTo(TaskStatus.BLOCKED)).toBe(true)
        })

        it('should not allow transitions from cancelled status', () => {
            const cancelledTask = task.updateStatus(TaskStatus.CANCELLED)
            expect(cancelledTask.canTransitionTo(TaskStatus.IN_PROGRESS)).toBe(false)
            expect(cancelledTask.canTransitionTo(TaskStatus.COMPLETED)).toBe(false)
        })

        it('should only allow reopening completed tasks to in-progress', () => {
            const completedTask = task.updateStatus(TaskStatus.COMPLETED)
            expect(completedTask.canTransitionTo(TaskStatus.IN_PROGRESS)).toBe(true)
            expect(completedTask.canTransitionTo(TaskStatus.NOT_STARTED)).toBe(false)
            expect(completedTask.canTransitionTo(TaskStatus.BLOCKED)).toBe(false)
        })

        it('should throw error for invalid transitions', () => {
            const cancelledTask = task.updateStatus(TaskStatus.CANCELLED)
            expect(() => cancelledTask.updateStatus(TaskStatus.IN_PROGRESS)).toThrow()
        })
    })

    describe('task operations', () => {
        it('should update task details', () => {
            const updated = task.updateDetails({
                title: 'Updated Task',
                description: 'New description',
                assignee: 'John Doe'
            })

            expect(updated.title).toBe('Updated Task')
            expect(updated.description).toBe('New description')
            expect(updated.assignee).toBe('John Doe')
            expect(updated.updatedAt).not.toBe(task.updatedAt)
        })

        it('should move task to different staff and line', () => {
            const moved = task.moveTo('staff-2', 4)

            expect(moved.staffId).toBe('staff-2')
            expect(moved.staffLine).toBe(4)
            expect(moved.updatedAt).not.toBe(task.updatedAt)
        })

        it('should reschedule task', () => {
            const rescheduled = task.reschedule('2024-02-01', 10)

            expect(rescheduled.startDate).toBe('2024-02-01')
            expect(rescheduled.durationDays).toBe(10)
            expect(rescheduled.endDate).toBe('2024-02-11')
        })

        it('should assign task to user', () => {
            const assigned = task.assignTo('Jane Smith')

            expect(assigned.assignee).toBe('Jane Smith')
            expect(assigned.updatedAt).not.toBe(task.updatedAt)
        })

        it('should set lane index', () => {
            const laned = task.setLaneIndex(3)

            expect(laned.laneIndex).toBe(3)
            expect(laned.updatedAt).not.toBe(task.updatedAt)
        })
    })

    describe('task queries', () => {
        it('should check if task is blocked', () => {
            expect(task.isBlocked()).toBe(false)

            const blockedTask = task.updateStatus(TaskStatus.BLOCKED)
            expect(blockedTask.isBlocked()).toBe(true)
        })

        it('should check if task is completed', () => {
            expect(task.isCompleted()).toBe(false)

            const completedTask = task.updateStatus(TaskStatus.COMPLETED)
            expect(completedTask.isCompleted()).toBe(true)
        })

        it('should check if task is active', () => {
            expect(task.isActive()).toBe(false)

            const activeTask = task.updateStatus(TaskStatus.IN_PROGRESS)
            expect(activeTask.isActive()).toBe(true)
        })

        it('should check if task is pending', () => {
            expect(task.isPending()).toBe(true)

            const startedTask = task.updateStatus(TaskStatus.IN_PROGRESS)
            expect(startedTask.isPending()).toBe(false)
        })

        it('should check if task is cancelled', () => {
            expect(task.isCancelled()).toBe(false)

            const cancelledTask = task.updateStatus(TaskStatus.CANCELLED)
            expect(cancelledTask.isCancelled()).toBe(true)
        })
    })

    describe('serialization', () => {
        it('should serialize to JSON', () => {
            const json = task.toJSON()

            expect(json).toEqual({
                id: 'task-1',
                title: 'Test Task',
                startDate: '2024-01-01',
                durationDays: 5,
                status: TaskStatus.NOT_STARTED,
                assignee: undefined,
                description: undefined,
                staffId: 'staff-1',
                staffLine: 2,
                laneIndex: undefined,
                projectId: 'project-1',
                createdAt: task.createdAt,
                updatedAt: task.updatedAt
            })
        })

        it('should deserialize from persistence', () => {
            const json = task.toJSON()
            const deserialized = Task.fromPersistence(json)

            expect(deserialized.id).toBe(task.id)
            expect(deserialized.title).toBe(task.title)
            expect(deserialized.startDate).toBe(task.startDate)
            expect(deserialized.durationDays).toBe(task.durationDays)
        })
    })

    describe('performance', () => {
        it('should create 10000 tasks quickly with Bun', () => {
            const timer = new PerformanceTimer()
            timer.start()

            const tasks: Task[] = []
            for (let i = 0; i < 10000; i++) {
                tasks.push(Task.create({
                    id: `task-${i}`,
                    title: `Task ${i}`,
                    startDate: '2024-01-01',
                    durationDays: Math.floor(Math.random() * 30) + 1,
                    status: TaskStatus.NOT_STARTED,
                    staffId: `staff-${i % 5}`,
                    staffLine: i % 10,
                    projectId: 'project-1'
                }))
            }

            const elapsed = timer.measure('creation')

            expect(tasks).toHaveLength(10000)
            expect(elapsed).toBeLessThan(100) // Should be very fast with Bun

            console.log(`Created 10000 tasks in ${elapsed}ms with Bun`)
        })
    })
})
