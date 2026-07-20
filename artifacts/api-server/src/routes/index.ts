import { Router, type IRouter } from 'express';
import healthRouter from './health';
import authRouter from './auth';
import customersRouter from './customers';
import callsRouter from './calls';
import remarksRouter from './remarks';
import remindersRouter from './reminders';
import categoriesRouter from './categories';
import dashboardRouter from './dashboard';
import reportsRouter from './reports';
import agentsRouter from './agents';
import pipelineRouter from './pipeline';
import targetsRouter from './targets';
import expensesRouter from './expenses';
import attendanceRouter from './attendance';

const router: IRouter = Router();

router.use(healthRouter);
router.use('/auth',       authRouter);
router.use('/customers',  customersRouter);
router.use('/calls',      callsRouter);
router.use('/remarks',    remarksRouter);
router.use('/reminders',  remindersRouter);
router.use('/categories', categoriesRouter);
router.use('/dashboard',  dashboardRouter);
router.use('/reports',    reportsRouter);
router.use('/agents',     agentsRouter);
// ERP modules
router.use('/pipeline',   pipelineRouter);
router.use('/targets',    targetsRouter);
router.use('/expenses',   expensesRouter);
router.use('/attendance', attendanceRouter);

export default router;
