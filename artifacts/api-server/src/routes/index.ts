import { Router, type IRouter } from "express";
import healthRouter from "./health";
import budgetRouter from "./budget";
import authRouter from "./auth";
import sponsorsRouter from "./sponsors";
import auditRouter from "./audit";
import agendaRouter from "./agenda";
import subEventsRouter from "./sub-events";
import flightsRouter from "./flights";
import hotelRouter from "./hotel";
import networkingCocktailRouter from "./networking-cocktail";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(budgetRouter);
router.use(sponsorsRouter);
router.use(auditRouter);
router.use(agendaRouter);
router.use(subEventsRouter);
router.use(flightsRouter);
router.use(hotelRouter);
router.use(networkingCocktailRouter);

export default router;
