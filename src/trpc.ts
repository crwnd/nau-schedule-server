import { TRPCError, initTRPC } from '@trpc/server';
import mongoose from 'mongoose';
import * as trpcExpress from '@trpc/server/adapters/express';
import { OpenApiMeta } from 'trpc-openapi';
import * as jose from 'jose';
import { type TApp, type TUser } from './types.js';
import Apps from './models/apps.js';

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env', });

console.log('connecting to mongodb...');
mongoose.set('debug', true);
mongoose.set('strictQuery', true);
mongoose.connect(process.env.MONGO_LINK || '', { dbName: process.env.DB_NAME, });
const db = mongoose.connection;
db.on('error', () => console.error.bind(console, 'connection error: '));
db.once('open', () => console.log('Connected successfully'));

console.log('getting JWKS...');
const JWKS = jose.createRemoteJWKSet(new URL(`${process.env.ISSUER_BASE_URL}.well-known/jwks.json`))
console.log('JWKS done');

export const decodeAuth0Token = async (token: string) => await jose.jwtVerify(token, JWKS, {
    issuer: process.env.ISSUER_BASE_URL,
    audience: process.env.AUDIENCE,
})

// created for each request
export const createContext = async ({
    req,
    res,
}: trpcExpress.CreateExpressContextOptions) => {
    let user: TUser | null = null;
    try {
        user = req.headers.authorization ? (await decodeAuth0Token(req.headers.authorization.split(' ')[1])).payload as TUser : null;
    } catch (e) {
        console.warn('error decoding Auth0 token', e)
    }

    let app: TApp & { token: string } | null = null;
    if (!user) {
        try {
            app = req.headers.authorization ? (await Apps.findOne({ "tokens.code": req.headers.authorization.split(' ')[1] }))?.toObject() ?? null : null;
            if (app) app.token = req.headers.authorization!.split(' ')[1]
        } catch (e) {
            console.warn('error decoding app token', e)
        }
    }

    return {
        mongoose,
        user,
        app
    }
};
type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.meta<OpenApiMeta>().context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const getProtectedProcedure = (permissions: string[]) => publicProcedure.use((opts) => {
    if (hasPermission(opts.ctx, permissions)) return opts.next();

    throw new TRPCError({
        code: 'FORBIDDEN',
        message: `No permission "${permissions.join(', ')}" to access this resource`,
    })
});

export const hasPermission = (ctx: Context, permissions: string[]) => {
    if (ctx.user && permissions.some(p => ctx.user?.permissions.includes(p))) {
        return true
    }
    if (ctx.app?.token && permissions.some(p => ctx.app?.tokens.find(e => e.code === ctx.app?.token)?.flags.includes(p))) {
        return true
    }
    return false
}
