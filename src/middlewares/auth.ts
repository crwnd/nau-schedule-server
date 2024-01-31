import { auth } from "express-oauth2-jwt-bearer";
import * as dotenv from 'dotenv';
import Apps, { TApp } from "../models/apps.js";
import { Request, Response } from "express";
import Validators from "../validators.js";

dotenv.config({ path: '.env', });
export interface TokenProtectedRequest extends Request { App?: TApp & { permissions: string[] } }

export const checkJwt = auth({
    audience: process.env.AUDIENCE,
    issuerBaseURL: process.env.ISSUER_BASE_URL,
});

export function getTokenMiddleware(requiredFlag: string | undefined) {
    return async (req: TokenProtectedRequest, res: Response, next: Function) => {
        // const token: string = (req.query.token || req.body.token) as string || "";
        const token = req.get("Authorization")?.split(" ")[1] ?? '';
        if (!Validators.validateToken(token)) return res.status(401).json({ error: "token is required" });
        const app = await Apps.findOne({ "tokens.code": token });
        if (!app) return res.status(401).json({ error: "token does not exist" });
        if (requiredFlag !== undefined)
            if (!app.tokens.find(el => el.code === token && el.active === true && el.flags.includes(requiredFlag))) return res.status(403).json({ error: requiredFlag + " not allowed for this token" });

        req.App = { ...app, permissions: app.tokens.find(el => el.code === token)!.flags };
        next();
    }
}