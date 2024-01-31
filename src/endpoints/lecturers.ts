import express, { Router, Request, Response } from "express";
import { Lecturers } from "../services/nau_api.js";

const router: Router = express.Router();

router.get('/', async (req: Request, res: Response) => {
    return res.json(await Lecturers());
});

export default router;