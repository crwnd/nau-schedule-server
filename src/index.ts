import { publicProcedure, router } from "./trpc.js";
import { generateOpenApiDocument } from "trpc-openapi";
import { purpleRouter } from "./purple/index.js";
import { Groups, Lecturers } from "./services/nau_api.js";
import { z } from "zod";
import { GroupSchema, LecturerFullSchema, UserSchema } from "./types.js";

export const appRouter = router({
    groups: router({
        index: publicProcedure
            .meta({ openapi: { method: 'GET', path: '/groups/index', tags: ['groups'], protect: false } })
            .input(z.void())
            .output(z.array(GroupSchema))
            .query(async ({ input }) => await Groups() ?? [])
    }),
    users: router({
        lookup: publicProcedure
            .meta({ openapi: { method: 'GET', path: '/users/lookup', tags: ['users'], protect: true } })
            .input(z.void())
            .output(UserSchema.nullable())
            .query(async ({ ctx }) => ctx.user)
    }),
    lecturers: router({
        index: publicProcedure
            .meta({ openapi: { method: 'GET', path: '/lecturers/index', tags: ['lecturers'], protect: false } })
            .input(z.void())
            .output(z.array(LecturerFullSchema))
            .query(async () => await Lecturers())
    }),
    purple: purpleRouter,
});

export type AppRouter = typeof appRouter;

// Generate OpenAPI schema document
export const openApiDocument = generateOpenApiDocument(appRouter, {
    title: 'NAU Schedule API',
    description: 'TODO: add descriptionn<br>Purple - schedule v2',
    version: '0.0.1',
    baseUrl: process.env.BASE_URL || 'https://schedule.crwnd.dev/api/',
    docsUrl: 'https://github.com/crwnd/nau-schedule-server',
    tags: ['apps', 'groups', 'specialities', 'users', 'purple/schedule', 'purple/lessons', 'purple/changes', 'purple/week-syncs'],
});