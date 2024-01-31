import express, { Router, Request, Response } from "express";
import hexoid from 'hexoid';
import Schedules from "../models/schedules.js";
import { getRandomInt, isDateValid, resolveTemplate } from './common_functions.js';
import { LessonChangeInputSchema, LessonSchema } from "../types.js";
import { requiredScopes } from "express-oauth2-jwt-bearer";
import { z } from "zod";
import { GetFaculty, GetGroup } from "../services/nau_api.js";
import Specialities from "../models/specialities.js";
import Users from "../models/users.js";
import { checkJwt, getTokenMiddleware } from "../middlewares/auth.js";

const router: Router = express.Router();

const GetLesson = async (req: Request, res: Response) => {
    const input = z.object({ group_code: z.string(), code: z.string() }).parse(req.query)
    const Schedule = await Schedules.findOne({ group: input.group_code });
    if (!Schedule) return res.status(400).json({ error: "schedule not found" });
    const Group = await GetGroup(input.group_code)
    if (!Group) return res.status(400).json({ error: "group not found" });

    const lesson = Schedule.lessons.add.find(l => l.code === input.code)
    if (!lesson) return res.status(400).json({ error: "lesson not found" });

    return res.json({ lesson });
}

router.get('/app', getTokenMiddleware('read:lessons'), GetLesson);
router.get('/', checkJwt, requiredScopes('read:lessons'), GetLesson);

const CreateLesson = async (req: Request, res: Response) => {
    console.log(JSON.stringify(req.body, null, 2))
    const input = LessonSchema.extend({ group_code: z.string() }).parse(req.body)
    const { group_code, ...lessonObjForDB } = input
    const Schedule = await Schedules.findOne({ group: input.group_code });
    if (!Schedule) return res.status(400).json({ error: "schedule not found" });
    const Group = await GetGroup(input.group_code)
    const Speciality = await Specialities.findOne({ code: Group.speciality });
    if (!Speciality) return res.status(400).json({ error: "speciality not found" });

    if (!lessonObjForDB.template || resolveTemplate(lessonObjForDB.template, Schedule!.lesson_templates, Speciality.lesson_templates || []))
        lessonObjForDB.template = undefined

    console.log('lesson for db', lessonObjForDB)

    if (Array.isArray(lessonObjForDB.lecturers) && lessonObjForDB.lecturers.length > 0) {
        const lecturers = await Users.find({ code: { $in: lessonObjForDB.lecturers } })
        if (lecturers.length !== lessonObjForDB.lecturers.length) return res.status(400).json({ error: `${lessonObjForDB.lecturers.find(l => !lecturers.some(le => le.code === l))} not found` });
    }
    if (lessonObjForDB.template) {
        const template = Speciality.lesson_templates?.find(t => t.id === lessonObjForDB.template)
        if (!template) return res.status(400).json({ error: `template ${lessonObjForDB.template} not found` });
    }

    const lesson = { ...lessonObjForDB, code: hexoid(16)() }
    await Schedule.updateOne({ $push: { 'lessons.add': lesson } })
    return res.json({ lesson });
}

router.post('/app', getTokenMiddleware('write:lessons'), CreateLesson);
router.post('/', checkJwt, requiredScopes('write:lessons'), CreateLesson);

const UpdateLesson = async (req: Request, res: Response) => {
    console.log(JSON.stringify(req.body, null, 2))
    const input = LessonSchema.extend({ group_code: z.string() }).parse(req.body)
    const { group_code, ...lessonObjForDB } = input
    const Schedule = await Schedules.findOne({ group: input.group_code });
    if (!Schedule) return res.status(400).json({ error: "schedule not found" });
    const Group = await GetGroup(input.group_code)
    const Speciality = await Specialities.findOne({ code: Group.speciality });
    if (!Speciality) return res.status(400).json({ error: "speciality not found" });

    if (!lessonObjForDB.template || resolveTemplate(lessonObjForDB.template, Schedule!.lesson_templates, Speciality.lesson_templates || []))
        lessonObjForDB.template = undefined

    console.log('lesson for db', lessonObjForDB)

    if (Array.isArray(lessonObjForDB.lecturers) && lessonObjForDB.lecturers.length > 0) {
        const lecturers = await Users.find({ code: { $in: lessonObjForDB.lecturers } })
        if (lecturers.length !== lessonObjForDB.lecturers.length) return res.status(400).json({ error: `${lessonObjForDB.lecturers.find(l => !lecturers.some(le => le.code === l))} not found` });
    }
    if (lessonObjForDB.template) {
        const template = Speciality.lesson_templates?.find(t => t.id === lessonObjForDB.template)
        if (!template) return res.status(400).json({ error: `template ${lessonObjForDB.template} not found` });
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
    return res.json({ lesson: lessonObjForDB });
}

router.patch('/app', getTokenMiddleware('write:lessons'), UpdateLesson);
router.patch('/', checkJwt, requiredScopes('write:lessons'), UpdateLesson);

const DeleteLesson = async (req: Request, res: Response) => {
    console.log(JSON.stringify(req.body, null, 2))
    const input = z.object({ code: z.string(), group_code: z.string() }).parse(req.body)
    const Schedule = await Schedules.findOne({ group: input.group_code });
    if (!Schedule) return res.status(400).json({ error: "schedule not found" });
    const Group = await GetGroup(input.group_code)
    const Speciality = await Specialities.findOne({ code: Group.speciality });
    if (!Speciality) return res.status(400).json({ error: "speciality not found" });

    const lesson = Schedule.lessons.add.find(l => l.code === input.code)
    await Schedule.updateOne({ $pull: { 'lessons.add': { code: input.code } } })
    return res.json({ lesson });
}

router.delete('/app', getTokenMiddleware('delete:lessons'), DeleteLesson);
router.delete('/', checkJwt, requiredScopes('delete:lessons'), DeleteLesson);

export default router;