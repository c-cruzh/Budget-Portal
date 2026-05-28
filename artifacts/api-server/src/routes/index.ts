import { Router, type IRouter } from "express";
import healthRouter from "./health";
import budgetRouter from "./budget";
import authRouter from "./auth";
import sponsorsRouter from "./sponsors";
import auditRouter from "./audit";
import agendaRouter from "./agenda";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(budgetRouter);
router.use(sponsorsRouter);
router.use(auditRouter);
router.use(agendaRouter);

export default router;
