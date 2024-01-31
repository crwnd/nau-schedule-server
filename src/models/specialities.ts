import { Document, model, Schema } from "mongoose";
import { LessonTemplate } from "../types";

export type TSchedule = {
    code: string,
    lesson_templates: Array<LessonTemplate>
};

export interface ISchedule extends TSchedule, Document { }

const specialitiesSchema: Schema = new Schema({
    code: { type: String, required: true, unique: true },
    names: [{ type: String }],
    lesson_templates: [{
        type: Object,
        id: String,
        subgroup: { type: Number, required: false },
        lecturers: [{ type: String, required: false }],
        names: [{ type: String, required: false }],
        time: { type: Number, required: false },
        duration: { type: Number, required: false },
        places: [{ type: Object, required: false, text: String, place_type: String }],
        lesson_type: { type: String, required: false },
    }]
});

const Specialities = model<ISchedule>("Specialities", specialitiesSchema);

export default Specialities;