
import hexoid from 'hexoid'
import { LessonTemplateSchema } from "../types.js"
import { z } from "zod"
import { GetGroup } from "../services/nau_api.js"
import Specialities from "../models/specialities.js"
import { getProtectedProcedure, router } from "../trpc.js"


export const templatesRouter = router({
    index: getProtectedProcedure(['read:templates'])
        .meta({ openapi: { method: 'GET', path: '/purple/templates/index', tags: ['purple/templates'], protect: true } })
        .input(z.object({ speciality: z.string() }))
        .output(z.array(LessonTemplateSchema))
        .query(async ({ input, ctx }) => {
            const { speciality } = input
            const Speciality = await Specialities.findOne({ code: speciality });
            if (!Speciality) throw "speciality not found"

            z.array(LessonTemplateSchema).parse(Speciality.lesson_templates)

            return Speciality.lesson_templates
        }),
    create: getProtectedProcedure(['create:templates'])
        .meta({ openapi: { method: 'POST', path: '/purple/templates/create', tags: ['purple/templates'], protect: true } })
        .input(LessonTemplateSchema.extend({ speciality: z.string() }))
        .output(LessonTemplateSchema)
        .mutation(async ({ input, ctx }) => {
            const { speciality, ...templateObjForDB } = input
            const Speciality = await Specialities.findOne({ code: speciality });
            if (!Speciality) throw "speciality not found"

            Speciality.lesson_templates.push({ ...templateObjForDB, id: hexoid()() });
            await Speciality.save();

            return Speciality.lesson_templates[Speciality.lesson_templates.length - 1]
        }),
    byGroup: getProtectedProcedure(['read:templates'])
        .meta({ openapi: { method: 'GET', path: '/purple/templates/byGroup', tags: ['purple/templates'], protect: true } })
        .input(z.object({ group_code: z.string() }))
        .output(z.array(LessonTemplateSchema))
        .query(async ({ input, ctx }) => {
            const { group_code } = input
            const Group = await GetGroup(group_code)
            if (!Group) throw "group not found"
            const Speciality = await Specialities.findOne({ code: Group.speciality });
            if (!Speciality) throw "speciality not found"

            return Speciality?.lesson_templates
        })
})

export type TemplatesRouter = typeof templatesRouter
