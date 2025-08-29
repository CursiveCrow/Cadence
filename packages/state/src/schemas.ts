import { z } from 'zod'

const IdString = z.string().min(1)

export const UIStateSchema = z.object({
    activeProjectId: IdString.nullable(),
    selection: z.array(IdString),
    viewport: z.object({
        x: z.number(),
        y: z.number(),
        zoom: z.number().min(0.1).max(10),
    }),
})
