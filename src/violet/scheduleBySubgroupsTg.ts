import express, { Router, Request, Response } from "express";
import { getDayLessons, isDateValid, countweek_number, countday_number } from '../purple/common_functions.js';
import Schedules, { ISchedule } from "../models/schedules.js";
import Apps from "../models/apps.js";
import Validators from "../validators.js";
import { z } from "zod";
import Groups from "../models/groups.js";
import { GetFaculty, GetGroup } from "../services/nau_api.js";
import Specialities from "../models/specialities.js";

const router: Router = express.Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        const telegramId = z.preprocess((a) => BigInt(a as string), z.bigint()).parse(req.query.telegram_id)
        const groups = await Groups.find({ telegram_ids: telegramId });
        // const users = await Users.find({ telegram_ids: telegramId });
        // if (groups.length === 0 && telegram_id) {
        //     const users = await Users.find({ is_deleted: false, telegram_ids: telegram_id }, 'code');
        //     if (users.length === 0) return res.status(400).json({ error: "users and groups not found" });
        //     groups = await Groups.find({ is_deleted: false, 'members.code': { $in: users.map(user => user.code) } }, ['speciality', 'faculty', 'code', 'names', 'desc', 'has_second_subgroup', '-_id']);
        // }
        if (groups.length === 0) return res.status(400).json({ error: "groups not found" });
        let schedules = [];
        for (const group of groups) {
            const Group = await GetGroup(group.code);
            if (!Group) return res.status(400).json({ error: `group ${group.code} not found` });
            let Schedule: ISchedule = (await Schedules.findOne({ group: Group.code }))!;
            if (!Schedule) return res.status(400).json({ error: "schedule not found" });
            const Speciality = await Specialities.findOne({ code: Group.speciality });
            if (!Speciality) return res.status(400).json({ error: "speciality not found" });

            if (!req.query.day) return res.status(400).json({ error: "day is required" })
            if (!req.query.month) return res.status(400).json({ error: "month is required" })
            if (!req.query.year) return res.status(400).json({ error: "year is required" })
            if (!isDateValid(parseInt(req.query.day as string), parseInt(req.query.month as string), parseInt(req.query.year as string)))
                return res.status(400).json({ error: "wrong date" });

            let showPlace: boolean = Schedule.show_links as boolean;
            if (req.query.show_place === "true" || req.query.show_place === "on") {
                const token: string = req.query.token as string || "";
                if (!Validators.validateToken(token)) return res.status(400).json({ error: "token is required" });
                const app = await Apps.findOne({ "tokens.code": token });
                if (!app) return res.status(400).json({ error: "token does not exist" });
                if (!app.tokens.find(el => el.code === token && el.active === true && el.flags.includes("show-places"))) return res.status(400).json({ error: "show-places not allowed for this token" });
                showPlace = true;
            }

            let nowThere = new Date();
            nowThere = new Date(nowThere.valueOf() - nowThere.getTimezoneOffset());

            const lessons = await getDayLessons(
                Schedule,
                Speciality.lesson_templates,
                parseInt(req.query.day as string),
                parseInt(req.query.month as string),
                parseInt(req.query.year as string),
                req.query.onetimes === "false",
                req.query.permanents === "false",
                showPlace,
            )

            schedules.push({
                group: {
                    code: Group.code,
                    names: Group.names,
                    desc: Group.desc,
                },
                first_subgroup: lessons.filter(el => el.subgroup === 1 || el.subgroup === 0 || el.subgroup === -1).map(el => ({ ...el, local_id: el.code, place: Array.isArray(el.places) ? el.places[0]?.text : '' })),
                second_subgroup: Group.has_second_subgroup ? lessons.filter(el => el.subgroup === 2 || el.subgroup === 0 || el.subgroup === -1).map(el => ({ ...el, local_id: el.code, place: Array.isArray(el.places) ? el.places[0]?.text : '' })) : null,
                week_number: countweek_number(new Date((new Date(parseInt(req.query.year as string), parseInt(req.query.month as string) - 1, parseInt(req.query.day as string))).valueOf() - nowThere.getTimezoneOffset() * 60 * 1000), Schedule.week_syncs),
                day_number: countday_number(parseInt(req.query.day as string), parseInt(req.query.month as string), parseInt(req.query.year as string)),
            });
        }
        return res.json(schedules)
    } catch (e) { console.error("schedule error", e); return res.status(400).json({ error: "general error" }); }
});

export default router;