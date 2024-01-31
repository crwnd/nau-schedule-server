import { Document, model, Schema } from "mongoose";
import { Lesson, LessonChange, LessonTemplate } from "../types";

export type TWeekSync = [number, number, number]; // Year, Week of year, Week number

export type TSchedule = {
    group: string,
    lesson_templates: Array<LessonTemplate>,
    lessons: {
        add: Array<Lesson>,
        change: Array<LessonChange>
    },
    show_links: boolean,
    week_syncs: Array<TWeekSync>
};

export interface ISchedule extends TSchedule, Document { }

const schedulesSchema: Schema = new Schema({
    group: { type: String, required: true, },
    lessons: {
        add: [
            {
                type: Object,
                day_number: { type: Number, required: true },
                week_number: { type: Number, required: true },
                subgroup: { type: Number, required: true },
                names: [],
                time: { type: Number, required: true },
                duration: { type: Number, required: true },
                places: [{ type: Object, place_type: String, text: String }],
                lesson_type: String,
                recordings: [String],
                lecturers: [String],
                start_date: [Number, Number, Number],
                end_date: [Number, Number, Number],
                canceled: Boolean
            }
        ], change: [
            {
                type: Object,
                code: String,
                day_number: { type: Number, required: true },
                week_number: { type: Number, required: true },
                subgroup: { type: Number, required: true },
                names: [],
                time: { type: Number, required: true },
                duration: { type: Number, required: true },
                places: [{ type: Object, place_type: String, text: String }],
                lesson_type: String,
                recordings: [String],
                lecturers: [String],
                start_date: [Number, Number, Number],
                canceled: Boolean
            }
        ]
    },
    show_links: { type: Boolean, default: false },
    week_syncs: [[Number /* Year */, Number /* Week of year */, Number /* Week number */]],
    lesson_templates: [{
        type: Object,
        id: String,
        subgroup: { type: Number, required: false },
        lecturers: [{ type: String, required: false }],
        names: [{ type: String, required: false }],
        time: { type: Number, required: false },
        duration: { type: Number, required: false },
        places: [{ type: Object, place_type: String, text: String }],
        lesson_type: { type: String, required: false },
    }]
});

const Schedules = model<ISchedule>("Schedules", schedulesSchema);

export default Schedules;