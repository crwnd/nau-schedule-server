import express, { Router, Request, Response } from "express";
import { getDayLessons, isDateValid, countweek_number, countday_number, getMonday } from './common_functions.js';
import Schedules, { ISchedule } from "../models/schedules.js";
import z from "zod";
import { LessonDayNumberSchema, LessonMonthNumberSchema, LessonWeekNumberSchema, LessonYearNumberSchema } from "../types.js";
import { checkJwt } from "../middlewares/auth.js";
import { GetFaculty, GetGroup } from "../services/nau_api.js";
import Specialities from "../models/specialities.js";

const router: Router = express.Router();

export const SingleDayPayload = z.object({
    day: LessonDayNumberSchema,
    month: LessonMonthNumberSchema,
    year: LessonYearNumberSchema,
    group_code: z.string(),
});
export const WeekPayload = z.object({
    week: LessonWeekNumberSchema,
    year: LessonYearNumberSchema,
    group_code: z.string(),
});

router.get('/public', async (req: Request, res: Response) => {
    const request = SingleDayPayload.parse(req.query);
    try {
        const Schedule: ISchedule = (await Schedules.findOne({ group: request.group_code }))!;
        if (!Schedule) return res.status(400).json({ error: "schedule not found" });
        const Group = await GetGroup(request.group_code)
        if (!Group) return res.status(400).json({ error: "group not found" });
        const Faculty = await GetFaculty(Group.faculty);
        if (!Faculty) return res.status(400).json({ error: "faculty not found" });
        const Speciality = await Specialities.findOne({ code: Group.speciality });
        if (!Speciality) return res.status(400).json({ error: "speciality not found" });

        if (!isDateValid(request.day, request.month, request.year))
            return res.status(400).json({ error: "wrong date" });

        let nowThere = new Date();
        nowThere = new Date(nowThere.valueOf() - nowThere.getTimezoneOffset());

        return res.json({
            lessons:
                await getDayLessons(
                    Schedule,
                    Speciality.lesson_templates,
                    request.day,
                    request.month,
                    request.year,
                    req.query.onetimes === "false",
                    req.query.permanents === "false",
                    false,
                ),
            week_number: countweek_number(new Date((new Date(request.year, request.month - 1, request.day)).valueOf() - nowThere.getTimezoneOffset() * 60 * 1000), Schedule.week_syncs),
            day_number: countday_number(request.day, request.month, request.year),
        }
        );
    } catch (e) { console.error("/schedule/public error: ", e); return res.status(400).json({ error: e === 'not calibrated!' ? 'not calibrated!' : "general error" }); }
});

router.get('/weekScheduleByWeekPublic', async (req: Request, res: Response) => {
    console.log(req.query)
    try {
        const request = WeekPayload.parse(req.query);
        const Schedule: ISchedule = (await Schedules.findOne({ group: request.group_code }))!;
        if (!Schedule) return res.status(400).json({ error: "schedule not found" });
        const Group = await GetGroup(request.group_code)
        if (!Group) return res.status(400).json({ error: "group not found" });
        const Faculty = await GetFaculty(Group.faculty);
        if (!Faculty) return res.status(400).json({ error: "faculty not found" });
        const Speciality = await Specialities.findOne({ code: Group.speciality });
        if (!Speciality) return res.status(400).json({ error: "speciality not found" });

        let nowThere = new Date();
        nowThere = new Date(nowThere.valueOf() - nowThere.getTimezoneOffset());
        const first_day_of_the_week = getMonday(new Date(new Date('Jan 01, ' + request.year + ' 01:00:00').getTime() + (request.week - 1) * 7 * 24 * 60 * 60 * 1000))
        let days = [];
        for (let index = 0; index < 7; index++) {
            const day = new Date(first_day_of_the_week.getTime() + (1000 * 60 * 60 * 24 * index))
            days.push({
                lessons:
                    await getDayLessons(
                        Schedule,
                        Speciality.lesson_templates,
                        day.getDate(),
                        day.getMonth() + 1,
                        day.getFullYear(),
                        req.body.onetimes === "false",
                        req.body.permanents === "false",
                        false,
                    ),
            });
        }
        return res.json({
            days: days,
            week_number: countweek_number(new Date(first_day_of_the_week.valueOf() - nowThere.getTimezoneOffset() * 60 * 1000), Schedule.week_syncs)
        });
    } catch (e) { console.error("schedule error: ", e); return res.status(400).json({ error: e }); }
});

router.get('/weekScheduleByWeek', checkJwt, async (req: Request, res: Response) => {
    try {
        const request = WeekPayload.parse(req.query);
        const Schedule: ISchedule = (await Schedules.findOne({ group: request.group_code }))!;
        if (!Schedule) return res.status(400).json({ error: "schedule not found" });
        const Group = await GetGroup(request.group_code)
        if (!Group) return res.status(400).json({ error: "group not found" });
        const Faculty = await GetFaculty(Group.faculty);
        if (!Faculty) return res.status(400).json({ error: "faculty not found" });
        const Speciality = await Specialities.findOne({ code: Group.speciality });
        if (!Speciality) return res.status(400).json({ error: "speciality not found" });

        let nowThere = new Date();
        nowThere = new Date(nowThere.valueOf() - nowThere.getTimezoneOffset());
        var d = new Date("Jan 01, " + request.year + " 01:00:00");
        var w = d.getTime() + 604800000 * (request.week - 1);
        const first_day_of_the_week = getMonday(new Date(new Date('Jan 01, ' + request.year + ' 01:00:00').getTime() + (request.week - 1) * 7 * 24 * 60 * 60 * 1000))
        let days = [];
        for (let index = 0; index < 7; index++) {
            const day = new Date(first_day_of_the_week.getTime() + (1000 * 60 * 60 * 24 * index))
            days.push({
                lessons:
                    await getDayLessons(
                        Schedule,
                        Speciality.lesson_templates,
                        day.getDate(),
                        day.getMonth() + 1,
                        day.getFullYear(),
                        req.body.onetimes === "false",
                        req.body.permanents === "false",
                        true,
                    ),
            });
        }
        return res.json({
            days: days,
            week_number: countweek_number(new Date(first_day_of_the_week.valueOf() - nowThere.getTimezoneOffset() * 60 * 1000), Schedule.week_syncs)
        });
    } catch (e) { console.error("schedule error: ", e); return res.status(400).json({ error: e }); }
});

router.get('/weekSchedule', checkJwt, async (req: Request, res: Response) => {
    const request = SingleDayPayload.parse(req.query);
    try {
        const Schedule: ISchedule = (await Schedules.findOne({ group: request.group_code }))!;
        if (!Schedule) return res.status(400).json({ error: "schedule not found" });
        const Group = await GetGroup(request.group_code)
        if (!Group) return res.status(400).json({ error: "group not found" });
        const Faculty = await GetFaculty(Group.faculty);
        if (!Faculty) return res.status(400).json({ error: "faculty not found" });
        const Speciality = await Specialities.findOne({ code: Group.speciality });
        if (!Speciality) return res.status(400).json({ error: "speciality not found" });

        if (!isDateValid(request.day, request.month, request.year))
            return res.status(400).json({ error: "wrong date" });

        let nowThere = new Date();
        nowThere = new Date(nowThere.valueOf() - nowThere.getTimezoneOffset());

        return res.json({
            lessons:
                await getDayLessons(
                    Schedule,
                    Speciality.lesson_templates,
                    request.day,
                    request.month,
                    request.year,
                    req.query.onetimes === "false",
                    req.query.permanents === "false",
                    true,
                ),
            week_number: countweek_number(new Date((new Date(request.year, request.month - 1, request.day)).valueOf() - nowThere.getTimezoneOffset() * 60 * 1000), Schedule.week_syncs),
            day_number: countday_number(request.day, request.month, request.year),
        }
        );
    } catch (e) { console.error("/schedule error: ", e); return res.status(400).json({ error: e === 'not calibrated!' ? 'not calibrated!' : "general error" }); }
});

router.get('/', checkJwt, async (req: Request, res: Response) => {
    const request = SingleDayPayload.parse(req.query);
    try {
        const Schedule: ISchedule = (await Schedules.findOne({ group: request.group_code }))!;
        if (!Schedule) return res.status(400).json({ error: "schedule not found" });
        const Group = await GetGroup(request.group_code)
        if (!Group) return res.status(400).json({ error: "group not found" });
        const Faculty = await GetFaculty(Group.faculty);
        if (!Faculty) return res.status(400).json({ error: "faculty not found" });
        const Speciality = await Specialities.findOne({ code: Group.speciality });
        if (!Speciality) return res.status(400).json({ error: "speciality not found" });


        if (!isDateValid(request.day, request.month, request.year))
            return res.status(400).json({ error: "wrong date" });

        let nowThere = new Date();
        nowThere = new Date(nowThere.valueOf() - nowThere.getTimezoneOffset());

        return res.json({
            lessons:
                await getDayLessons(
                    Schedule,
                    Speciality.lesson_templates,
                    request.day,
                    request.month,
                    request.year,
                    req.query.onetimes === "false",
                    req.query.permanents === "false",
                    true,
                ),
            week_number: countweek_number(new Date((new Date(request.year, request.month - 1, request.day)).valueOf() - nowThere.getTimezoneOffset() * 60 * 1000), Schedule.week_syncs),
            day_number: countday_number(request.day, request.month, request.year),
        }
        );
    } catch (e) { console.error("/schedule error: ", e); return res.status(400).json({ error: e === 'not calibrated!' ? 'not calibrated!' : "general error" }); }
});

export default router;