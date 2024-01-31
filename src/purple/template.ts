import express, { Router, Request, Response } from "express";
import Schedules from "../models/schedules.js";
import { getRandomInt, isDateValid, resolveTemplate } from './common_functions.js';
import { LessonChangeInputSchema, LessonSchema, LessonTemplateSchema } from "../types.js";
import { requiredScopes } from "express-oauth2-jwt-bearer";
import { z } from "zod";
import { GetFaculty, GetGroup } from "../services/nau_api.js";
import Specialities from "../models/specialities.js";
import { checkJwt } from "../middlewares/auth.js";

const router: Router = express.Router();

router.post('/change', checkJwt, requiredScopes('write:lessons'), async (req: Request, res: Response) => {
    console.log(JSON.stringify(req.body, null, 2))
    const input = LessonChangeInputSchema.extend({ group_code: z.string() }).parse(req.body)
    console.log(input)
    const { group_code, ...lessonObjForDB } = input
    const Schedule = await Schedules.findOne({ group: input.group_code });
    if (!Schedule) return res.status(400).json({ error: "schedule not found" });
    const Group = await GetGroup(input.group_code)
    if (!Group) return res.status(400).json({ error: "group not found" });
    console.log('Group', Group)
    // const Faculty = await GetFaculty(Group.faculty);
    // if (!Faculty) return res.status(400).json({ error: "faculty not found" });
    // console.log('Faculty', Faculty)
    const Speciality = await Specialities.findOne({ code: Group.speciality });
    if (!Speciality) return res.status(400).json({ error: "speciality not found" });

    console.log('change lesson', lessonObjForDB)
    if (!lessonObjForDB.template || resolveTemplate(lessonObjForDB.template, Schedule!.lesson_templates, Speciality.lesson_templates || []))
        lessonObjForDB.template = undefined

    // let alsoCheck: Array<string> = ["lecturers", "names", "comment", "duration", "place", "lesson_type", "recordings", "subgroup", "canceled"];
    // alsoCheck.forEach(alsoCheckElem => {
    //     if (req.body[alsoCheckElem] !== undefined && req.body[alsoCheckElem] !== null && req.body[alsoCheckElem] !== "")
    //         switch (alsoCheckElem) {
    //             case "recordings":
    //             case "names":
    //             case "lecturers":
    //                 if (!Array.isArray(JSON.parse(req.body[alsoCheckElem]))) {
    //                     res.status(400).json({ error: alsoCheckElem + " must by json array" }); return;
    //                 }
    //                 lessonObjForDB = Object.assign({}, lessonObjForDB, { [alsoCheckElem]: JSON.parse(req.body[alsoCheckElem]) });
    //                 break;
    //             case "subgroup":
    //             case "duration":
    //                 if (!Number.isInteger(parseInt(req.body[alsoCheckElem]))) {
    //                     res.status(400).json({ error: alsoCheckElem + " must by integer" }); return;
    //                 }
    //                 lessonObjForDB = Object.assign({}, lessonObjForDB, { [alsoCheckElem]: parseInt(req.body[alsoCheckElem]) as number });
    //                 break;
    //             case "canceled":
    //                 lessonObjForDB = Object.assign({}, lessonObjForDB, { [alsoCheckElem]: req.body[alsoCheckElem] === 'true' || req.body[alsoCheckElem] === true });
    //                 break;
    //             default:
    //                 if (alsoCheckElem === "place" && req.body[alsoCheckElem] === "--hidden--") {
    //                     return res.status(400).json({ error: "place must not be --hidden--" });
    //                 }
    //                 lessonObjForDB = Object.assign({}, lessonObjForDB, { [alsoCheckElem]: req.body[alsoCheckElem].substring(0, 200) as string });
    //         }
    // });

    Schedule.lessons.change.push(lessonObjForDB as any);
    await Schedule.save();
    return res.json({ lessons: lessonObjForDB });
});

router.get('/byGroup', checkJwt, requiredScopes('read:templates'), async (req: Request, res: Response) => {
    const input = z.object({ group_code: z.string() }).parse(req.body)
    const { group_code } = input
    const Group = await GetGroup(group_code)
    if (!Group) return res.status(400).json({ error: "group not found" });
    const Speciality = await Specialities.findOne({ code: Group.speciality });
    if (!Speciality) return res.status(400).json({ error: "speciality not found" });

    return res.json({ lesson_templates: Speciality?.lesson_templates });
});

router.get('/', checkJwt, requiredScopes('write:lessons'), async (req: Request, res: Response) => {
    const input = z.object({ speciality: z.string() }).parse(req.query)
    const { speciality } = input
    const Speciality = await Specialities.findOne({ code: speciality });
    if (!Speciality) return res.status(400).json({ error: "speciality not found" });

    return res.json({ lesson_templates: Speciality?.lesson_templates });
});

router.post('/', checkJwt, requiredScopes('write:templates'), async (req: Request, res: Response) => {
    console.log(JSON.stringify(req.body, null, 2))
    const input = LessonTemplateSchema.extend({ speciality: z.string() }).parse(req.body)
    const { speciality, ...templateObjForDB } = input
    const Speciality = await Specialities.findOne({ code: speciality });
    if (!Speciality) return res.status(400).json({ error: "speciality not found" });

    Speciality?.lesson_templates.push(templateObjForDB);
    await Speciality.save();
    return res.json({ lesson_templates: Speciality?.lesson_templates });
});

export default router;