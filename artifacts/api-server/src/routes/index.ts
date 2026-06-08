import { Router, type IRouter } from "express";
import healthRouter from "./health";
import leadsRouter from "./leads";
import outreachRouter from "./outreach";
import aiRouter from "./ai";
import dashboardRouter from "./dashboard";
import discoveryRouter from "./discovery";

const router: IRouter = Router();

router.use(healthRouter);
router.use(leadsRouter);
router.use(outreachRouter);
router.use(aiRouter);
router.use(dashboardRouter);
router.use(discoveryRouter);

export default router;
