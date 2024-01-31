import express, { Router, Request, Response } from "express";
import hexoid from 'hexoid';
import Schedules from "../models/schedules.js";
import { getRandomInt, isDateValid, resolveTemplate } from './common_functions.js';
import { LessonChangeInputSchema, LessonChangeSchema, LessonSchema } from "../types.js";
import { requiredScopes } from "express-oauth2-jwt-bearer";
import { z } from "zod";
import { GetGroup } from "../services/nau_api.js";
import Specialities from "../models/specialities.js";
import Users from "../models/users.js";
import { checkJwt, getTokenMiddleware } from "../middlewares/auth.js";

const router: Router = express.Router();

const GetChanges = async (req: Request, res: Response) => {
    const input = z.object({ group_code: z.string(), lesson_code: z.string() }).parse(req.query)
    const Schedule = await Schedules.findOne({ group: input.group_code });
    if (!Schedule) return res.status(400).json({ error: "schedule not found" });

    const changes = Schedule.lessons.change.filter(c => c.lesson_code === input.lesson_code)

    return res.json({ changes });
}

router.get('/many/app', getTokenMiddleware('read:lessons'), GetChanges);
router.get('/many', checkJwt, requiredScopes('read:lessons'), GetChanges);

const GetChange = async (req: Request, res: Response) => {
    const input = z.object({ group_code: z.string(), change_code: z.string() }).parse(req.query)
    const Schedule = await Schedules.findOne({ group: input.group_code });
    if (!Schedule) return res.status(400).json({ error: "schedule not found" });

    const change = Schedule.lessons.change.find(c => c.code === input.change_code)

    return res.json({ change });
}

router.get('/app', getTokenMiddleware('read:lessons'), GetChange);
router.get('/', checkJwt, requiredScopes('read:lessons'), GetChange);

const CreateChange = async (req: Request, res: Response) => {
    const input = LessonChangeInputSchema.extend({ group_code: z.string() }).parse(req.body)
    const { group_code, ...lessonObjForDB } = input
    const Schedule = await Schedules.findOne({ group: input.group_code });
    if (!Schedule) return res.status(400).json({ error: "schedule not found" });
    const Group = await GetGroup(input.group_code)
    if (!Group) return res.status(400).json({ error: "group not found" });
    const Speciality = await Specialities.findOne({ code: Group.speciality });
    if (!Speciality) return res.status(400).json({ error: "speciality not found" });

    if (!lessonObjForDB.template || resolveTemplate(lessonObjForDB.template, Schedule!.lesson_templates, Speciality.lesson_templates || []))
        lessonObjForDB.template = undefined

    const change = { ...lessonObjForDB, code: hexoid(16)() }
    console.log('change for db', change)

    await Schedule.updateOne({ $push: { 'lessons.change': change } })
    return res.json({ change });
}

router.post('/app', getTokenMiddleware('write:lessons'), CreateChange);
router.post('/', checkJwt, requiredScopes('write:lessons'), CreateChange);

const UpdateChange = async (req: Request, res: Response) => {
    const input = LessonChangeSchema.extend({ group_code: z.string() }).parse(req.body)
    const { group_code, ...lessonObjForDB } = input
    const Schedule = await Schedules.findOne({ group: input.group_code });
    if (!Schedule) return res.status(400).json({ error: "schedule not found" });
    const Group = await GetGroup(input.group_code)
    if (!Group) return res.status(400).json({ error: "group not found" });
    const Speciality = await Specialities.findOne({ code: Group.speciality });
    if (!Speciality) return res.status(400).json({ error: "speciality not found" });

    if (!lessonObjForDB.template || resolveTemplate(lessonObjForDB.template, Schedule!.lesson_templates, Speciality.lesson_templates || []))
        lessonObjForDB.template = undefined

    const change = { ...lessonObjForDB }
    console.log('change for db', change)

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
        // { $push: { 'lessons.change': change } }
    )
    return res.json({ change });
}

router.patch('/app', getTokenMiddleware('write:lessons'), UpdateChange);
router.patch('/', checkJwt, requiredScopes('write:lessons'), UpdateChange);

const DeleteChange = async (req: Request, res: Response) => {
    console.log(JSON.stringify(req.body, null, 2))
    const input = z.object({ code: z.string(), group_code: z.string() }).parse(req.body)
    const Schedule = await Schedules.findOne({ group: input.group_code });
    if (!Schedule) return res.status(400).json({ error: "schedule not found" });
    const Group = await GetGroup(input.group_code)
    const Speciality = await Specialities.findOne({ code: Group.speciality });
    if (!Speciality) return res.status(400).json({ error: "speciality not found" });

    await Schedule.updateOne({ $pull: { 'lessons.change': { code: input.code } } })
    return res.status(204).send();
}

router.delete('/app', getTokenMiddleware('delete:lessons'), DeleteChange);
router.delete('/', checkJwt, requiredScopes('delete:lessons'), DeleteChange);

export default router;