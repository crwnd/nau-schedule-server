
import hexoid from 'hexoid'
import Schedules from "../models/schedules.js"
import { resolveTemplate } from './common_functions.js'
import { LessonSchema } from "../types.js"
import { z } from "zod"
import { GetGroup } from "../services/nau_api.js"
import Specialities from "../models/specialities.js"
import Users from "../models/users.js"
import { getProtectedProcedure, router } from "../trpc.js"


export const lessonsRouter = router({
    getSingle: getProtectedProcedure(['read:lessons'])
        .meta({ openapi: { method: 'GET', path: '/purple/lessons/getSingle', tags: ['purple/lessons'], protect: true } })
        .input(z.object({ group_code: z.string(), code: z.string() }))
        .output(LessonSchema)
        .query(async ({ input, ctx }) => {
            const Schedule = await Schedules.findOne({ group: input.group_code })
            if (!Schedule) throw "schedule not found"
            const Group = await GetGroup(input.group_code)
            if (!Group) throw "group not found"


            Schedule.lessons.add = Schedule.lessons.add.map(l => (!l.subgroup ? { ...l, subgroup: 0 } : l))
            await Schedule.save()

            const lesson = Schedule.lessons.add.find(l => l.code === input.code)
            if (!lesson) throw "lesson not found"

            return lesson
        }),
    getMany: getProtectedProcedure(['read:lessons'])
        .meta({ openapi: { method: 'GET', path: '/purple/lessons/getMany', tags: ['purple/lessons'], protect: true } })
        .input(z.object({ group_code: z.string(), code: z.string() }))
        .output(z.array(LessonSchema))
        .query(async ({ input, ctx }) => {
            const Schedule = await Schedules.findOne({ group: input.group_code })
            if (!Schedule) throw "schedule not found"
            const Group = await GetGroup(input.group_code)
            if (!Group) throw "group not found"

            return Schedule.lessons.add
        }),
    create: getProtectedProcedure(['write:lessons'])
        .meta({ openapi: { method: 'POST', path: '/purple/lessons/create', tags: ['purple/lessons'], protect: true } })
        .input(LessonSchema.extend({ group_code: z.string() }))
        .output(LessonSchema)
        .mutation(async ({ input, ctx }) => {
            const { group_code, ...lessonObjForDB } = input
            const Schedule = await Schedules.findOne({ group: input.group_code })
            if (!Schedule) throw "schedule not found"
            const Group = await GetGroup(input.group_code)
            if (!Group) throw "group not found"
            const Speciality = await Specialities.findOne({ code: Group.speciality })
            if (!Speciality) throw "speciality not found"

            if (lessonObjForDB.template)
                if(!resolveTemplate(lessonObjForDB.template, Schedule.lesson_templates, Speciality.lesson_templates || []))
                    throw `template ${lessonObjForDB.template} not found`

            console.log('lesson for db', lessonObjForDB)

            if (Array.isArray(lessonObjForDB.lecturers) && lessonObjForDB.lecturers.length > 0) {
                const lecturers = await Users.find({ code: { $in: lessonObjForDB.lecturers } })
                if (lecturers.length !== lessonObjForDB.lecturers.length) throw `${lessonObjForDB.lecturers.find(l => !lecturers.some(le => le.code === l))} not found`
            }

            const lesson = { ...lessonObjForDB, code: hexoid(16)() }
            await Schedule.updateOne({ $push: { 'lessons.add': lesson } })
            return lesson
        }),
    update: getProtectedProcedure(['write:lessons'])
        .meta({ openapi: { method: 'POST', path: '/purple/lessons/update', tags: ['purple/lessons'], protect: true } })
        .input(LessonSchema.extend({ group_code: z.string() }))
        .output(LessonSchema)
        .mutation(async ({ input, ctx }) => {
            const { group_code, ...lessonObjForDB } = input
            const Schedule = await Schedules.findOne({ group: input.group_code })
            if (!Schedule) throw "schedule not found"
            const Group = await GetGroup(input.group_code)
            if (!Group) throw "group not found"
            const Speciality = await Specialities.findOne({ code: Group.speciality })
            if (!Speciality) throw "speciality not found"

            if (lessonObjForDB.template)
                if(!resolveTemplate(lessonObjForDB.template, Schedule.lesson_templates, Speciality.lesson_templates || []))
                    throw `template ${lessonObjForDB.template} not found`

            if (Array.isArray(lessonObjForDB.lecturers) && lessonObjForDB.lecturers.length > 0) {
                const lecturers = await Users.find({ code: { $in: lessonObjForDB.lecturers } })
                if (lecturers.length !== lessonObjForDB.lecturers.length) throw `${lessonObjForDB.lecturers.find(l => !lecturers.some(le => le.code === l))} not found`
            }

            await Schedule.updateOne({
                $set: {
                    'lessons.add.$[x]': lessonObjForDB
                }
            },
                {
                    arrayFilters: [
                        { "x.code": lessonObjForDB.code }
                    ]
                })
            return lessonObjForDB
        }),
    destroy: getProtectedProcedure(['write:lessons'])
        .meta({ openapi: { method: 'POST', path: '/purple/lessons/destroy', tags: ['purple/lessons'], protect: true } })
        .input(z.object({ code: z.string(), group_code: z.string() }))
        .output(LessonSchema)
        .mutation(async ({ input, ctx }) => {
            const Schedule = await Schedules.findOne({ group: input.group_code })
            if (!Schedule) throw "schedule not found"
            const Group = await GetGroup(input.group_code)
            if (!Group) throw "group not found"
            const Speciality = await Specialities.findOne({ code: Group.speciality })
            if (!Speciality) throw "speciality not found"

            const lesson = Schedule.lessons.add.find(l => l.code === input.code)
            if (!lesson) throw "lesson not found"
            await Schedule.updateOne({ $pull: { 'lessons.add': { code: input.code } } })
            return lesson
        })
})

export type LessonsRouter = typeof lessonsRouter
