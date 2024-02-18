'use strict';
import express, { Application, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env', });
import cookieParser from 'cookie-parser';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';


const PORT = parseInt(process.env.PORT || '3256');

// import lecturersHandler from './endpoints/lecturers.js';
// import usersHandler from './endpoints/user.js';
// import groupsHandler from './endpoints/groups.js';
// import purpleTemplateHandler from './purple/template.js';
// import purpleScheduleHandler from './purple/schedule.js';
// import purpleLessonHandler from './purple/lesson.js';
// import purpleChangeHandler from './purple/change.js';
// import purpleWeekSyncHandler from './purple/weekSync.js';
// import weekScheduleHandler from './purple/weekSchedule.js';
import violetScheduleBySubgroupsTgHandler from './violet/scheduleBySubgroupsTg.js';
import { openApiDocument } from './index.js';
import { appRouter } from './index.js';
import { createContext } from './trpc.js';
import { createOpenApiExpressMiddleware } from 'trpc-openapi/dist/adapters/express.js';

// (BigInt.prototype as any).toJSON = function () {
//     return this.toString();
// };

const app: Application = express();
app.use(cookieParser());
app.use(compression());
app.use(express.json());
app.use(cors({ 'methods': 'GET,HEAD,PUT,PATCH,POST,DELETE', }))
app.use(express.urlencoded({ extended: true }));

// app.use('/', (req: Request, res: Response, next: NextFunction) =>
//     req.url.includes('Auth0') ? checkJwt(req, res, next) : next()
// );

app.use('/violet/scheduleBySubgroupsTg', violetScheduleBySubgroupsTgHandler);

app.use('/api/docs', swaggerUi.serve);
app.get('/api/docs', swaggerUi.setup(openApiDocument));

app.use('/', createOpenApiExpressMiddleware({
    router: appRouter,
    createContext,
}));

// app.use((err: Error, _req: Request, res: Response, _next: Function) => {
//     console.error(err.stack)
//     return res.status(500).send('Something broke!')
// })
app.listen(PORT, (): void => console.log('SERVER IS UP ON PORT:', PORT));