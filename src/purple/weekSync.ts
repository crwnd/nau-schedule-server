import express, { Router, Request, Response } from "express";
import Schedules, { TWeekSync } from "../models/schedules.js";
import { getweek_number } from "./common_functions.js";
import { requiredScopes } from "express-oauth2-jwt-bearer";

const router: Router = express.Router();

router.post('/', requiredScopes('write:sync-lessons'), async (req: Request, res: Response) => {
    const group_code: string = req.body.group_code as string || "";
    if (!group_code) return res.status(400).json({ error: "group_code is required" });
    let Schedule = await Schedules.findOne({ group: group_code });
    if (!Schedule) return res.status(400).json({ error: "schedule not found" });

    let syncArr: TWeekSync = [0, 0, 0];
    try {
        let year: number = (new Date()).getFullYear();
        if (req.body.year)
            year = parseInt(req.body.year);
        if (year < 2022 || year >= 2050)
            return res.status(400).json({ error: "year wrong (must be 2022-2050)" });
        syncArr[0] = year;

        let week: number = getweek_number(new Date());
        if (req.body.week)
            week = parseInt(req.body.week);
        if (week <= 0 || week >= 53)
            return res.status(400).json({ error: "week wrong (must be 1-52)" });
        syncArr[1] = week;

        let week_number: number = 1;
        if (!req.body.week_number)
            return res.status(400).json({ error: "week_number must be provided" });
        if (req.body.week_number)
            week_number = parseInt(req.body.week_number);
        if (week_number <= 0 || week_number >= 3)
            return res.status(400).json({ error: "week_number wrong (must be 1-2)" });
        syncArr[2] = week_number;

        Schedule.week_syncs.push(syncArr);
        await Schedule.save();
    } catch (e) {
        return res.status(400).json({ error: "unknown error" });
    }

    return res.json({ sync: syncArr });
});

export default router;