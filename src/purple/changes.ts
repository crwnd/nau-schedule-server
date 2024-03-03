import hexoid from 'hexoid'
import Schedules from "../models/schedules.js"
import { resolveTemplate } from './common_functions.js'
import { LessonChangeInputSchema, LessonChangeSchema } from "../types.js"
import { z } from "zod"
import { GetGroup } from "../services/nau_api.js"
import Specialities from "../models/specialities.js"
import { getProtectedProcedure, router } from "../trpc.js"


export const changesRouter = router({
    getSingle: getProtectedProcedure(['read:lessons'])
        .meta({ openapi: { method: 'GET', path: '/purple/changes/getSingle', tags: ['purple/changes'], protect: true } })
        .input(z.object({ group_code: z.string(), change_code: z.string() }))
        .output(LessonChangeSchema)
        .query(async ({ input, ctx }) => {
            const Schedule = await Schedules.findOne({ group: input.group_code });
            if (!Schedule) throw "schedule not found"

            const change = Schedule.lessons.change.find(c => c.code === input.change_code)
            if (!change) throw "change not found"

            return change
        }),
    getMany: getProtectedProcedure(['read:lessons'])
        .meta({ openapi: { method: 'GET', path: '/purple/changes/getMany', tags: ['purple/changes'], protect: true } })
        .input(z.object({ group_code: z.string(), lesson_code: z.string().optional() }))
        .output(z.array(LessonChangeSchema))
        .query(async ({ input, ctx }) => {
            const Schedule = await Schedules.findOne({ group: input.group_code })
            if (!Schedule) throw "schedule not found"

            // Schedule.lessons.change = Schedule.lessons.change.map(c => (!c.code ? { ...c, code: hexoid(16)() } : c))
            // await Schedule.save()

            const changes = input.lesson_code ? Schedule.lessons.change : Schedule.lessons.change.filter(c => c.lesson_code === input.lesson_code)

            return changes
        }),
    create: getProtectedProcedure(['write:lessons'])
        .meta({ openapi: { method: 'POST', path: '/purple/changes/create', tags: ['purple/changes'], protect: true } })
        .input(LessonChangeInputSchema.extend({ group_code: z.string() }))
        .output(LessonChangeSchema)
        .mutation(async ({ input, ctx }) => {
            const { group_code, ...lessonObjForDB } = input
            const Schedule = await Schedules.findOne({ group: input.group_code });
            if (!Schedule) throw "schedule not found";
            const Group = await GetGroup(input.group_code)
            if (!Group) throw "group not found";
            const Speciality = await Specialities.findOne({ code: Group.speciality });
            if (!Speciality) throw "speciality not found";

            if (!lessonObjForDB.template || !resolveTemplate(lessonObjForDB.template, Schedule!.lesson_templates, Speciality.lesson_templates || []))
                lessonObjForDB.template = undefined

            const change = { ...lessonObjForDB, code: hexoid(16)() }

            await Schedule.updateOne({ $push: { 'lessons.change': change } })
            return change
        }),
    update: getProtectedProcedure(['write:lessons'])
        .meta({ openapi: { method: 'POST', path: '/purple/changes/update', tags: ['purple/changes'], protect: true } })
        .input(LessonChangeSchema.extend({ group_code: z.string() }))
        .output(LessonChangeSchema)
        .mutation(async ({ input, ctx }) => {
            const { group_code, ...change } = input
            const Schedule = await Schedules.findOne({ group: input.group_code });
            if (!Schedule) throw "schedule not found"
            const Group = await GetGroup(input.group_code)
            if (!Group) throw "group not found"
            const Speciality = await Specialities.findOne({ code: Group.speciality });
            if (!Speciality) throw "speciality not found"

            if (change.template)
                if(!resolveTemplate(change.template, Schedule.lesson_templates, Speciality.lesson_templates || []))
                    throw `template ${change.template} not found`

            await Schedule.updateOne(
                {
                    $set: {
                        'lessons.change.$[x]': change
                    }
                },
                {
                    arrayFilters: [
                        { "x.code": change.code }
                    ]
                }
            )
            return change
        }),
    destroy: getProtectedProcedure(['write:lessons'])
        .meta({ openapi: { method: 'POST', path: '/purple/changes/destroy', tags: ['purple/changes'], protect: true } })
        .input(z.object({ code: z.string(), group_code: z.string() }))
        .output(LessonChangeSchema)
        .mutation(async ({ input, ctx }) => {
            const Schedule = await Schedules.findOne({ group: input.group_code });
            if (!Schedule) throw "schedule not found"
            const Group = await GetGroup(input.group_code)
            if (!Group) throw "group not found"
            const Speciality = await Specialities.findOne({ code: Group.speciality });
            if (!Speciality) throw "speciality not found"

            const change = Schedule.lessons.change.find(l => l.code === input.code)
            if (!change) throw "lesson not found"
            await Schedule.updateOne({ $pull: { 'lessons.change': { code: input.code } } })
            return change
        })
})

export type ChangesRouter = typeof changesRouter
