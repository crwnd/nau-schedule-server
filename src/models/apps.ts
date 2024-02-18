import { Document, model, Schema } from "mongoose";
import { TApp } from "../types";

export interface IApp extends TApp, Document { }

const appsSchema: Schema = new Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    icon: String,
    owner: String,
    tokens: [{
        type: Object,
        code: { type: String, unique: true },
        issued: Number,
        flags: [String],
        active: { type: Boolean, default: true }
    }]
});

const Apps = model<IApp>("Apps", appsSchema);

export default Apps;