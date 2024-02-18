import { z } from "zod";
import { hasPermission, publicProcedure, router } from "../trpc.js";
import { MonthDaySchema, LessonMonthNumberSchema, LessonWeekNumberSchema, YearNumberSchema, OutputDayObjectSchema, OutputDayObject } from "../types.js";
import { countday_number, countweek_number, getDayLessons, getMonday } from "./common_functions.js";
import Schedules, { ISchedule } from "../models/schedules.js";
import { GetFaculty, GetGroup } from "../services/nau_api.js";
import Specialities from "../models/specialities.js";
import Groups from "../models/groups.js";

export const SingleDayPayload = z.object({
    day: MonthDaySchema,
    month: LessonMonthNumberSchema,
    year: YearNumberSchema,
    onetimes: z.boolean().optional(),
    permanents: z.boolean().optional()
});
export const SingleDayPayloadGroupcode = SingleDayPayload.extend({
    group_code: z.string(),
});
export const SingleDayPayloadTg = SingleDayPayload.extend({
    telegram_id: z.number(),
});
export const WeekPayload = z.object({
    week: LessonWeekNumberSchema,
    year: YearNumberSchema,
    group_code: z.string(),
    onetimes: z.boolean().optional(),
    permanents: z.boolean().optional()
});

export const scheduleRouter = router({
    singleDay: publicProcedure
        .meta({ openapi: { method: 'GET', path: '/purple/schedule/singleDay', tags: ['purple/schedule'], protect: true } })
        .input(SingleDayPayloadGroupcode)
        .output(z.object({
            lessons: z.array(OutputDayObjectSchema),
            week_number: z.number(),
            day_number: z.number(),
        }))
        .query(async ({ input, ctx }) => {
            const Schedule: ISchedule = (await Schedules.findOne({ group: input.group_code }))!;
            if (!Schedule) throw "schedule not found";
            const Group = await GetGroup(input.group_code)
            if (!Group) throw "group not found";
            const Faculty = await GetFaculty(Group.faculty);
            if (!Faculty) throw "faculty not found";
            const Speciality = await Specialities.findOne({ code: Group.speciality });
            if (!Speciality) throw "speciality not found";

            let nowThere = new Date();
            nowThere = new Date(nowThere.valueOf() - nowThere.getTimezoneOffset());

            return {
                lessons:
                    await getDayLessons(
                        Schedule,
                        Speciality.lesson_templates,
                        input.day,
                        input.month,
                        input.year,
                        input.onetimes === false,
                        input.permanents === false,
                        hasPermission(ctx, ['read:lessons']),
                    ),
                week_number: countweek_number(new Date((new Date(input.year, input.month - 1, input.day)).valueOf() - nowThere.getTimezoneOffset() * 60 * 1000), Schedule.week_syncs),
                day_number: countday_number(input.day, input.month, input.year),
            }
        }),
    singleDayBySubgroupsTg: publicProcedure
        .meta({ openapi: { method: 'GET', path: '/purple/schedule/singleDayBySubgroupsTg', tags: ['purple/schedule'], protect: true } })
        .input(SingleDayPayloadTg)
        .output(z.array(z.object({
            group: z.object({
                code: z.string(),
                names: z.array(z.string()),
                desc: z.string(),
            }),
            first_subgroup: z.array(OutputDayObjectSchema),
            second_subgroup: z.array(OutputDayObjectSchema).nullable(),
            week_number: z.number(),
            day_number: z.number(),
        })))
        .query(async ({ input, ctx }) => {
            const groups = await Groups.find({ telegram_ids: input.telegram_id });
            // const users = await Users.find({ telegram_ids: telegramId });
            // if (groups.length === 0 && telegram_id) {
            //     const users = await Users.find({ is_deleted: false, telegram_ids: telegram_id }, 'code');
            //     if (users.length === 0) return res.status(400).json({ error: "users and groups not found" });
            //     groups = await Groups.find({ is_deleted: false, 'members.code': { $in: users.map(user => user.code) } }, ['speciality', 'faculty', 'code', 'names', 'desc', 'has_second_subgroup', '-_id']);
            // }
            let schedules: {
                group: {
                    code: string,
                    names: string[],
                    desc: string,
                },
                first_subgroup: OutputDayObject[],
                second_subgroup: OutputDayObject[] | null,
                week_number: number,
                day_number: number,
            }[] = [];
            if (groups.length === 0) return schedules;
            for (const group of groups) {
                const Group = await GetGroup(group.code);
                if (!Group) throw `group ${group.code} not found`
                let Schedule: ISchedule = (await Schedules.findOne({ group: Group.code }))!;
                if (!Schedule) throw "schedule not found"
                const Speciality = await Specialities.findOne({ code: Group.speciality });
                if (!Speciality) throw "speciality not found"

                let nowThere = new Date();
                nowThere = new Date(nowThere.valueOf() - nowThere.getTimezoneOffset());

                const lessons = await getDayLessons(
                    Schedule,
                    Speciality.lesson_templates,
                    input.day,
                    input.month,
                    input.year,
                    input.onetimes === false,
                    input.permanents === false,
                    hasPermission(ctx, ['read:lessons']),
                )

                schedules.push({
                    group: {
                        code: Group.code,
                        names: Group.names,
                        desc: Group.desc,
                    },
                    first_subgroup: lessons.filter(el => el.subgroup === 1 || el.subgroup === 0 || el.subgroup === -1),
                    second_subgroup: Group.has_second_subgroup ? lessons.filter(el => el.subgroup === 2 || el.subgroup === 0 || el.subgroup === -1) : null,
                    week_number: countweek_number(new Date((new Date(input.year, input.month - 1, input.day)).valueOf() - nowThere.getTimezoneOffset() * 60 * 1000), Schedule.week_syncs),
                    day_number: countday_number(input.day, input.month, input.year),
                });
            }

            return schedules

            // const Schedule: ISchedule = (await Schedules.findOne({ group: input.group_code }))!;
            // if (!Schedule) throw "schedule not found";
            // const Group = await GetGroup(input.group_code)
            // if (!Group) throw "group not found";
            // const Faculty = await GetFaculty(Group.faculty);
            // if (!Faculty) throw "faculty not found";
            // const Speciality = await Specialities.findOne({ code: Group.speciality });
            // if (!Speciality) throw "speciality not found";

            // let nowThere = new Date();
            // nowThere = new Date(nowThere.valueOf() - nowThere.getTimezoneOffset());

            // return {
            //     lessons:
            //         await getDayLessons(
            //             Schedule,
            //             Speciality.lesson_templates,
            //             input.day,
            //             input.month,
            //             input.year,
            //             input.onetimes === false,
            //             input.permanents === false,
            //             hasPermission(ctx, ['read:lessons']),
            //         ),
            //     week_number: countweek_number(new Date((new Date(input.year, input.month - 1, input.day)).valueOf() - nowThere.getTimezoneOffset() * 60 * 1000), Schedule.week_syncs),
            //     day_number: countday_number(input.day, input.month, input.year),
            // }
        }),
    weekSchedule: publicProcedure
        .meta({ openapi: { method: 'GET', path: '/purple/schedule/weekSchedule', tags: ['purple/schedule'], protect: true } })
        .input(SingleDayPayloadGroupcode)
        .output(z.object({
            lessons: z.array(OutputDayObjectSchema),
            week_number: z.number(),
            day_number: z.number(),
        }))
        .query(async ({ input, ctx }) => {
            const Schedule: ISchedule = (await Schedules.findOne({ group: input.group_code }))!;
            if (!Schedule) throw "schedule not found";
            const Group = await GetGroup(input.group_code)
            if (!Group) throw "group not found";
            const Faculty = await GetFaculty(Group.faculty);
            if (!Faculty) throw "faculty not found";
            const Speciality = await Specialities.findOne({ code: Group.speciality });
            if (!Speciality) throw "speciality not found";

            let nowThere = new Date();
            nowThere = new Date(nowThere.valueOf() - nowThere.getTimezoneOffset());
            return {
                lessons:
                    await getDayLessons(
                        Schedule,
                        Speciality.lesson_templates,
                        input.day,
                        input.month,
                        input.year,
                        input.onetimes === false,
                        input.permanents === false,
                        hasPermission(ctx, ['read:lessons']),
                    ),
                week_number: countweek_number(new Date((new Date(input.year, input.month - 1, input.day)).valueOf() - nowThere.getTimezoneOffset() * 60 * 1000), Schedule.week_syncs),
                day_number: countday_number(input.day, input.month, input.year),
            }
        }),
    weekScheduleByWeek: publicProcedure
        .meta({ openapi: { method: 'GET', path: '/purple/schedule/weekScheduleByWeek', tags: ['purple/schedule'], protect: true } })
        .input(WeekPayload)
        .output(z.object({
            days: z.array(z.object({ lessons: z.array(OutputDayObjectSchema) })).length(7),
            week_number: z.number(),
        }))
        .query(async ({ input, ctx }) => {
            const Schedule: ISchedule = (await Schedules.findOne({ group: input.group_code }))!;
            if (!Schedule) throw "schedule not found";
            const Group = await GetGroup(input.group_code)
            if (!Group) throw "group not found";
            const Faculty = await GetFaculty(Group.faculty);
            if (!Faculty) throw "faculty not found";
            const Speciality = await Specialities.findOne({ code: Group.speciality });
            if (!Speciality) throw "speciality not found";

            let nowThere = new Date();
            nowThere = new Date(nowThere.valueOf() - nowThere.getTimezoneOffset());
            const first_day_of_the_week = getMonday(new Date(new Date('Jan 01, ' + input.year + ' 01:00:00').getTime() + (input.week - 1) * 7 * 24 * 60 * 60 * 1000))
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
                            input.onetimes === false,
                            input.permanents === false,
                            hasPermission(ctx, ['read:lessons']),
                        ),
                });
            }
            return {
                days: days,
                week_number: countweek_number(new Date(first_day_of_the_week.valueOf() - nowThere.getTimezoneOffset() * 60 * 1000), Schedule.week_syncs)
            };
        })
});

export type ScheduleRouter = typeof scheduleRouter;
