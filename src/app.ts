'use strict';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env', });
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { checkJwt } from './middlewares/auth.js';

import lecturersHandler from './endpoints/lecturers.js';
import usersHandler from './endpoints/user.js';
import groupsHandler from './endpoints/groups.js';
import purpleTemplateHandler from './purple/template.js';
import purpleScheduleHandler from './purple/schedule.js';
import purpleLessonHandler from './purple/lesson.js';
import purpleChangeHandler from './purple/change.js';
import purpleWeekSyncHandler from './purple/weekSync.js';
import violetScheduleBySubgroupsTgHandler from './violet/scheduleBySubgroupsTg.js';

(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

console.log("connecting to mongodb...");
mongoose.set("debug", true);
mongoose.set("strictQuery", true);
mongoose.connect(process.env.MONGO_LINK || "", { dbName: process.env.DB_NAME, } as mongoose.ConnectOptions);
const db = mongoose.connection;
db.on("error", () => console.error.bind(console, "connection error: "));
db.once("open", () => console.log("Connected successfully"));

const PORT: number = 3256;
const app: Application = express();
app.use(cookieParser());
app.use(compression());
app.use(express.json());
app.use(cors({ "methods": "GET,HEAD,PUT,PATCH,POST,DELETE", }))
app.use(express.urlencoded({ extended: true }));

app.use('/users', usersHandler);
app.use('/lecturers', lecturersHandler);
app.use('/groups', groupsHandler);
app.use('/purple/template', purpleTemplateHandler);
app.use('/purple/schedule', purpleScheduleHandler);
app.use('/purple/change', purpleChangeHandler);
app.use('/purple/lesson', checkJwt, purpleLessonHandler);
app.use('/purple/syncWeek', checkJwt, purpleWeekSyncHandler);
app.use('/violet/scheduleBySubgroupsTg', violetScheduleBySubgroupsTgHandler);

app.use('/', (req: Request, res: Response): express.Response => res.status(404).json({ error: "unknown method" }));

// app.use((err: Error, _req: Request, res: Response, _next: Function) => {
//     console.error(err.stack)
//     return res.status(500).send('Something broke!')
// })
app.listen(PORT, (): void => console.log('SERVER IS UP ON PORT:', PORT));