import { router } from "../trpc.js";
import { lessonsRouter } from "./lessons.js";
import { scheduleRouter } from "./schedule.js";
import { changesRouter } from "./changes.js";
import { templatesRouter } from "./templates.js";
import { weekSyncsRouter } from "./weekSync.js";


export const purpleRouter = router({
    schedule: scheduleRouter,
    lessons: lessonsRouter,
    changes: changesRouter,
    templates: templatesRouter,
    weekSyncs: weekSyncsRouter
});

export type PurpleRouter = typeof purpleRouter;
