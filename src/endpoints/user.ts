import express, { Router, Request, Response } from "express";
import { checkJwt } from '../middlewares/auth.js';

const router: Router = express.Router();

router.get('/lookup', checkJwt, async (req: Request, res: Response) => {
    return res.json(req.auth?.payload);
});

export default router;