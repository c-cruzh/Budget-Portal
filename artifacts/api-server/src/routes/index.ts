import {
  Router,
  type IRouter,
  type NextFunction,
  type Request,
  type Response,
} from "express";
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
import tasksBoardRouter from "./tasks-board";
import spacesRouter from "./spaces";
import montajeRouter from "./montaje";
import volunteersRouter from "./volunteers";

const router: IRouter = Router();

function requireAuthenticatedSession(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const session = req.session as any;
  if (!session?.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

router.use(healthRouter);
router.use(authRouter);
router.use(requireAuthenticatedSession);
router.use(budgetRouter);
router.use(sponsorsRouter);
router.use(auditRouter);
router.use(agendaRouter);
router.use(subEventsRouter);
router.use(flightsRouter);
router.use(hotelRouter);
router.use(networkingCocktailRouter);
router.use(tasksBoardRouter);
router.use(spacesRouter);
router.use(montajeRouter);
router.use(volunteersRouter);

export default router;
