import { Request } from "express";
import { z } from "zod";

export const DateTupleSchema = z.preprocess((a) => typeof a === "string" ? JSON.parse(a) : a, z.tuple([z.number().gte(2020).lte(2100), z.number().gte(1).lte(12), z.number().gte(1).lte(31)]))
export const LessonDayNumberSchema = z.preprocess((a) => parseInt(a as string, 10), z.number().gte(1).lte(7))
export const LessonWeekNumberSchema = z.preprocess((a) => parseInt(a as string, 10), z.number().gte(1).lte(53))
export const LessonMonthNumberSchema = z.preprocess((a) => parseInt(a as string, 10), z.number().gte(1).lte(12))
export const LessonYearNumberSchema = z.preprocess((a) => parseInt(a as string, 10), z.number().gte(2020).lte(2100))
export const LessonTimeSchema = z.number().gte(0).lte(1440)
export const SubgroupSchema = z.number().gte(0).lte(2)
export const LessonLocationSchema = z.enum([
    "online",
    "online_zoom",
    "online_meet",
    "online_classroom",
    "online_other",
    "offline",
    "offline_classroom",
    "auditory",
]);
export const LessonPlaceSchema = z.array(z.object({
    place_type: LessonLocationSchema,
    text: z.string()
}))
export type LessonLocation = z.infer<typeof LessonLocationSchema>;
export const CreatedBySchema = z.object({
    app_code: z.string().optional(),
    user_code: z.string().optional()
});
export type CreatedBy = z.infer<typeof CreatedBySchema>;
export const LecturerShortSchema = z.object({
    code: z.string(),
    name: z.string(),
    surname: z.string(),
    patronymic: z.string(),
});
export type LecturerShort = z.infer<typeof LecturerShortSchema>;
export const LecturerFullSchema = z.object({
    code: z.string(),
    lastname: z.string(),
    firstname: z.string(),
    patronymic: z.string(),
    email: z.string(),
    phone: z.string().optional()
});
export type LecturerFull = z.infer<typeof LecturerFullSchema>;
export const OutputDayObjectSchema = z.object({
    code: z.string(),
    used_template: z.string().optional(),
    subgroup: SubgroupSchema,
    lecturers: z.array(z.string()),
    names: z.array(z.string()),
    comment: z.string(),
    time: LessonTimeSchema,
    duration: z.number(),
    places: LessonPlaceSchema,
    canceled: z.boolean(),
    lesson_type: z.string(),
    recordings: z.array(z.string()),
});
export type OutputDayObject = z.infer<typeof OutputDayObjectSchema>;
export const LessonTemplateSchema = z.object({
    id: z.string(),
    subgroup: SubgroupSchema.optional(),
    lecturers: z.array(z.string()).optional(),
    names: z.array(z.string()),
    time: LessonTimeSchema.nullish(),
    duration: LessonTimeSchema.nullish(),
    places: LessonPlaceSchema.nullish(),
    lesson_type: z.string().optional(),
    canceled: z.boolean().optional(),
    created_by: CreatedBySchema.nullish()
});
export type LessonTemplate = z.infer<typeof LessonTemplateSchema>;
export const LessonSchema = z.object({
    day_number: LessonDayNumberSchema,
    week_number: LessonWeekNumberSchema,
    template: z.string().nullish(),
    lecturers: z.array(z.string()).nullish(),
    subgroup: SubgroupSchema,
    names: z.array(z.string()).optional(),
    comment: z.string().optional(),
    time: LessonTimeSchema,
    duration: LessonTimeSchema,
    places: LessonPlaceSchema.nullish(),
    lesson_type: z.string().nullish(),
    recordings: z.array(z.string()),
    start_date: DateTupleSchema,
    end_date: DateTupleSchema,
    code: z.string().optional(),
    canceled: z.boolean().optional(),
    created_by: CreatedBySchema.nullish()
});
export type Lesson = z.infer<typeof LessonSchema>;
export const LessonBase: Lesson = {
    day_number: -1,
    week_number: -1,
    template: undefined,
    lecturers: [],
    subgroup: 0,
    comment: "",
    names: ["Не заповнено", "Not filled"],
    time: 120,
    duration: 120,
    places: null,
    lesson_type: null,
    recordings: [],
    start_date: [2023, 9, 13],
    end_date: [2023, 12, 31],
    code: "--not-set--",
    canceled: false,
    created_by: null
};
export const LessonChangeSchema = z.object({
    code: z.string(),
    lesson_code: z.string(),
    start_date: DateTupleSchema,
    end_date: DateTupleSchema,
    template: z.string().nullish(),
    lecturers: z.array(z.string()).optional(),
    names: z.array(z.string()).optional(),
    comment: z.string().optional(),
    time: LessonTimeSchema.optional(),
    duration: LessonTimeSchema.optional(),
    places: LessonPlaceSchema.nullish(),
    lesson_type: z.string().optional(),
    recordings: z.array(z.string()).optional(),
    canceled: z.boolean().optional(),
    created_by: CreatedBySchema.optional()
});
export type LessonChange = z.infer<typeof LessonChangeSchema>;
export const LessonChangeInputSchema = z.object({
    lesson_code: z.string(),
    start_date: DateTupleSchema,
    end_date: DateTupleSchema,
    template: z.string().nullish(),
    lecturers: z.array(z.string()).optional(),
    names: z.array(z.string()).optional(),
    comment: z.string().optional(),
    time: LessonTimeSchema.optional(),
    duration: LessonTimeSchema.optional(),
    places: LessonPlaceSchema.optional(),
    lesson_type: z.string().optional(),
    recordings: z.array(z.string()).optional(),
    canceled: z.boolean().optional(),
    created_by: CreatedBySchema.optional()
});
export type LessonChangeInput = z.infer<typeof LessonChangeInputSchema>;

export const UserSchema = z.object({
    iss: z.string(),
    sub: z.string(),
    aud: z.array(z.string()),
    iat: z.number(),
    exp: z.number(),
    azp: z.string(),
    scope: z.string(),
    permissions: z.array(z.string())
});
export type TUser = z.infer<typeof UserSchema>;

export interface AuthedRequest extends Request { User?: TUser; }