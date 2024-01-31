import express, { Router, Request, Response } from "express";
import { checkJwt } from '../middlewares/auth.js';
import { Groups } from "../services/nau_api.js";

const router: Router = express.Router();

router.get('/', async (req: Request, res: Response) => {
    return res.json(await Groups());
});

export default router;