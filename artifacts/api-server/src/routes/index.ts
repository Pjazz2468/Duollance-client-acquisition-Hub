import { Router, type IRouter } from "express";
import healthRouter from "./health";
import leadsRouter from "./leads";
import outreachRouter from "./outreach";
import aiRouter from "./ai";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(leadsRouter);
router.use(outreachRouter);
router.use(aiRouter);
router.use(dashboardRouter);

export default router;
