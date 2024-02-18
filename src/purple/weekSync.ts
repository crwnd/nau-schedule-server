import { LessonTemplateSchema, LessonWeekNumberNumberSchema, LessonWeekNumberSchema, YearNumberSchema } from "../types.js"
import { z } from "zod"
import { getProtectedProcedure, router } from "../trpc.js"
import Schedules from "../models/schedules.js";


export const weekSyncsRouter = router({
    getMany: getProtectedProcedure(['read:weekSync'])
        .meta({ openapi: { method: 'GET', path: '/purple/weekSyncs/getMany', tags: ['purple/week-syncs'], protect: true } })
        .input(z.object({ group_code: z.string() }))
        .output(z.array(z.tuple([YearNumberSchema, LessonWeekNumberSchema, LessonWeekNumberNumberSchema])))
        .query(async ({ input, ctx }) => {
            let Schedule = await Schedules.findOne({ group: input.group_code });
            if (!Schedule) throw "schedule not found"

            return Schedule.week_syncs
        }),
    create: getProtectedProcedure(['create:weekSync'])
        .meta({ openapi: { method: 'POST', path: '/purple/weekSyncs/create', tags: ['purple/week-syncs'], protect: true } })
        .input(z.object({
            year: YearNumberSchema,
            week: LessonWeekNumberSchema,
            week_number: LessonWeekNumberNumberSchema,
            group_code: z.string(),
        }))
        .output(z.tuple([YearNumberSchema, LessonWeekNumberSchema, LessonWeekNumberNumberSchema]))
        .mutation(async ({ input, ctx }) => {
            let Schedule = await Schedules.findOne({ group: input.group_code });
            if (!Schedule) throw "schedule not found"


            Schedule.week_syncs.push([input.year, input.week, input.week_number]);
            await Schedule.save();

            return [input.year, input.week, input.week_number]
        }),
})

export type WeekSyncsRouter = typeof weekSyncsRouter
