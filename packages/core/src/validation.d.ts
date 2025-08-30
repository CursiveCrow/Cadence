/**
 * Validation schemas for Cadence Project Management System
 * Based on Design.md specification using Zod
 */
import { z } from 'zod'
import { TaskStatus, DependencyType } from './types'
export declare const ProjectSchema: z.ZodEffects<
  z.ZodObject<
    {
      id: z.ZodString
      name: z.ZodString
      startDate: z.ZodEffects<z.ZodString, string, string>
      endDate: z.ZodEffects<z.ZodString, string, string>
      createdAt: z.ZodEffects<z.ZodString, string, string>
      updatedAt: z.ZodEffects<z.ZodString, string, string>
    },
    'strip',
    z.ZodTypeAny,
    {
      id: string
      name: string
      startDate: string
      endDate: string
      createdAt: string
      updatedAt: string
    },
    {
      id: string
      name: string
      startDate: string
      endDate: string
      createdAt: string
      updatedAt: string
    }
  >,
  {
    id: string
    name: string
    startDate: string
    endDate: string
    createdAt: string
    updatedAt: string
  },
  {
    id: string
    name: string
    startDate: string
    endDate: string
    createdAt: string
    updatedAt: string
  }
>
export declare const TaskSchema: z.ZodObject<
  {
    id: z.ZodString
    title: z.ZodString
    startDate: z.ZodEffects<z.ZodString, string, string>
    durationDays: z.ZodNumber
    status: z.ZodNativeEnum<typeof TaskStatus>
    assignee: z.ZodOptional<z.ZodString>
    projectId: z.ZodString
    createdAt: z.ZodEffects<z.ZodString, string, string>
    updatedAt: z.ZodEffects<z.ZodString, string, string>
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string
    startDate: string
    createdAt: string
    updatedAt: string
    status: TaskStatus
    title: string
    durationDays: number
    projectId: string
    assignee?: string | undefined
  },
  {
    id: string
    startDate: string
    createdAt: string
    updatedAt: string
    status: TaskStatus
    title: string
    durationDays: number
    projectId: string
    assignee?: string | undefined
  }
>
export declare const MilestoneSchema: z.ZodObject<
  {
    id: z.ZodString
    title: z.ZodString
    date: z.ZodEffects<z.ZodString, string, string>
    projectId: z.ZodString
    createdAt: z.ZodEffects<z.ZodString, string, string>
    updatedAt: z.ZodEffects<z.ZodString, string, string>
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string
    createdAt: string
    updatedAt: string
    title: string
    date: string
    projectId: string
  },
  {
    id: string
    createdAt: string
    updatedAt: string
    title: string
    date: string
    projectId: string
  }
>
export declare const DependencySchema: z.ZodEffects<
  z.ZodObject<
    {
      id: z.ZodString
      srcTaskId: z.ZodString
      dstTaskId: z.ZodString
      type: z.ZodNativeEnum<typeof DependencyType>
      projectId: z.ZodString
      createdAt: z.ZodEffects<z.ZodString, string, string>
      updatedAt: z.ZodEffects<z.ZodString, string, string>
    },
    'strip',
    z.ZodTypeAny,
    {
      id: string
      createdAt: string
      updatedAt: string
      type: DependencyType
      projectId: string
      srcTaskId: string
      dstTaskId: string
    },
    {
      id: string
      createdAt: string
      updatedAt: string
      type: DependencyType
      projectId: string
      srcTaskId: string
      dstTaskId: string
    }
  >,
  {
    id: string
    createdAt: string
    updatedAt: string
    type: DependencyType
    projectId: string
    srcTaskId: string
    dstTaskId: string
  },
  {
    id: string
    createdAt: string
    updatedAt: string
    type: DependencyType
    projectId: string
    srcTaskId: string
    dstTaskId: string
  }
>
export declare const IPCOpenProjectSchema: z.ZodObject<
  {
    projectId: z.ZodString
  },
  'strip',
  z.ZodTypeAny,
  {
    projectId: string
  },
  {
    projectId: string
  }
>
export declare const IPCCreateTaskSchema: z.ZodObject<
  {
    projectId: z.ZodString
    title: z.ZodString
    startDate: z.ZodEffects<z.ZodString, string, string>
    durationDays: z.ZodNumber
    assignee: z.ZodOptional<z.ZodString>
  },
  'strip',
  z.ZodTypeAny,
  {
    startDate: string
    title: string
    durationDays: number
    projectId: string
    assignee?: string | undefined
  },
  {
    startDate: string
    title: string
    durationDays: number
    projectId: string
    assignee?: string | undefined
  }
>
export declare const IPCUpdateTaskSchema: z.ZodObject<
  {
    taskId: z.ZodString
    updates: z.ZodObject<
      {
        title: z.ZodOptional<z.ZodString>
        startDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>
        durationDays: z.ZodOptional<z.ZodNumber>
        status: z.ZodOptional<z.ZodNativeEnum<typeof TaskStatus>>
        assignee: z.ZodOptional<z.ZodString>
        description: z.ZodOptional<z.ZodString>
      },
      'strip',
      z.ZodTypeAny,
      {
        startDate?: string | undefined
        status?: TaskStatus | undefined
        title?: string | undefined
        durationDays?: number | undefined
        assignee?: string | undefined
        description?: string | undefined
      },
      {
        startDate?: string | undefined
        status?: TaskStatus | undefined
        title?: string | undefined
        durationDays?: number | undefined
        assignee?: string | undefined
        description?: string | undefined
      }
    >
  },
  'strip',
  z.ZodTypeAny,
  {
    taskId: string
    updates: {
      startDate?: string | undefined
      status?: TaskStatus | undefined
      title?: string | undefined
      durationDays?: number | undefined
      assignee?: string | undefined
      description?: string | undefined
    }
  },
  {
    taskId: string
    updates: {
      startDate?: string | undefined
      status?: TaskStatus | undefined
      title?: string | undefined
      durationDays?: number | undefined
      assignee?: string | undefined
      description?: string | undefined
    }
  }
>
export declare const IPCCreateDependencySchema: z.ZodEffects<
  z.ZodObject<
    {
      projectId: z.ZodString
      srcTaskId: z.ZodString
      dstTaskId: z.ZodString
      type: z.ZodNativeEnum<typeof DependencyType>
    },
    'strip',
    z.ZodTypeAny,
    {
      type: DependencyType
      projectId: string
      srcTaskId: string
      dstTaskId: string
    },
    {
      type: DependencyType
      projectId: string
      srcTaskId: string
      dstTaskId: string
    }
  >,
  {
    type: DependencyType
    projectId: string
    srcTaskId: string
    dstTaskId: string
  },
  {
    type: DependencyType
    projectId: string
    srcTaskId: string
    dstTaskId: string
  }
>
export declare const ProjectExportSchema: z.ZodObject<
  {
    project: z.ZodEffects<
      z.ZodObject<
        {
          id: z.ZodString
          name: z.ZodString
          startDate: z.ZodEffects<z.ZodString, string, string>
          endDate: z.ZodEffects<z.ZodString, string, string>
          createdAt: z.ZodEffects<z.ZodString, string, string>
          updatedAt: z.ZodEffects<z.ZodString, string, string>
        },
        'strip',
        z.ZodTypeAny,
        {
          id: string
          name: string
          startDate: string
          endDate: string
          createdAt: string
          updatedAt: string
        },
        {
          id: string
          name: string
          startDate: string
          endDate: string
          createdAt: string
          updatedAt: string
        }
      >,
      {
        id: string
        name: string
        startDate: string
        endDate: string
        createdAt: string
        updatedAt: string
      },
      {
        id: string
        name: string
        startDate: string
        endDate: string
        createdAt: string
        updatedAt: string
      }
    >
    tasks: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString
          title: z.ZodString
          startDate: z.ZodEffects<z.ZodString, string, string>
          durationDays: z.ZodNumber
          status: z.ZodNativeEnum<typeof TaskStatus>
          assignee: z.ZodOptional<z.ZodString>
          projectId: z.ZodString
          createdAt: z.ZodEffects<z.ZodString, string, string>
          updatedAt: z.ZodEffects<z.ZodString, string, string>
        },
        'strip',
        z.ZodTypeAny,
        {
          id: string
          startDate: string
          createdAt: string
          updatedAt: string
          status: TaskStatus
          title: string
          durationDays: number
          projectId: string
          assignee?: string | undefined
        },
        {
          id: string
          startDate: string
          createdAt: string
          updatedAt: string
          status: TaskStatus
          title: string
          durationDays: number
          projectId: string
          assignee?: string | undefined
        }
      >,
      'many'
    >
    dependencies: z.ZodArray<
      z.ZodEffects<
        z.ZodObject<
          {
            id: z.ZodString
            srcTaskId: z.ZodString
            dstTaskId: z.ZodString
            type: z.ZodNativeEnum<typeof DependencyType>
            projectId: z.ZodString
            createdAt: z.ZodEffects<z.ZodString, string, string>
            updatedAt: z.ZodEffects<z.ZodString, string, string>
          },
          'strip',
          z.ZodTypeAny,
          {
            id: string
            createdAt: string
            updatedAt: string
            type: DependencyType
            projectId: string
            srcTaskId: string
            dstTaskId: string
          },
          {
            id: string
            createdAt: string
            updatedAt: string
            type: DependencyType
            projectId: string
            srcTaskId: string
            dstTaskId: string
          }
        >,
        {
          id: string
          createdAt: string
          updatedAt: string
          type: DependencyType
          projectId: string
          srcTaskId: string
          dstTaskId: string
        },
        {
          id: string
          createdAt: string
          updatedAt: string
          type: DependencyType
          projectId: string
          srcTaskId: string
          dstTaskId: string
        }
      >,
      'many'
    >
    milestones: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString
          title: z.ZodString
          date: z.ZodEffects<z.ZodString, string, string>
          projectId: z.ZodString
          createdAt: z.ZodEffects<z.ZodString, string, string>
          updatedAt: z.ZodEffects<z.ZodString, string, string>
        },
        'strip',
        z.ZodTypeAny,
        {
          id: string
          createdAt: string
          updatedAt: string
          title: string
          date: string
          projectId: string
        },
        {
          id: string
          createdAt: string
          updatedAt: string
          title: string
          date: string
          projectId: string
        }
      >,
      'many'
    >
    exportedAt: z.ZodString
    version: z.ZodString
  },
  'strip',
  z.ZodTypeAny,
  {
    project: {
      id: string
      name: string
      startDate: string
      endDate: string
      createdAt: string
      updatedAt: string
    }
    tasks: {
      id: string
      startDate: string
      createdAt: string
      updatedAt: string
      status: TaskStatus
      title: string
      durationDays: number
      projectId: string
      assignee?: string | undefined
    }[]
    dependencies: {
      id: string
      createdAt: string
      updatedAt: string
      type: DependencyType
      projectId: string
      srcTaskId: string
      dstTaskId: string
    }[]
    milestones: {
      id: string
      createdAt: string
      updatedAt: string
      title: string
      date: string
      projectId: string
    }[]
    exportedAt: string
    version: string
  },
  {
    project: {
      id: string
      name: string
      startDate: string
      endDate: string
      createdAt: string
      updatedAt: string
    }
    tasks: {
      id: string
      startDate: string
      createdAt: string
      updatedAt: string
      status: TaskStatus
      title: string
      durationDays: number
      projectId: string
      assignee?: string | undefined
    }[]
    dependencies: {
      id: string
      createdAt: string
      updatedAt: string
      type: DependencyType
      projectId: string
      srcTaskId: string
      dstTaskId: string
    }[]
    milestones: {
      id: string
      createdAt: string
      updatedAt: string
      title: string
      date: string
      projectId: string
    }[]
    exportedAt: string
    version: string
  }
>
//# sourceMappingURL=validation.d.ts.map
