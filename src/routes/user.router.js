import express from 'express'
import { advice, changeLocation, generateAlert, saveCheckList, weatherReport } from '../controller/user.controller.js';

const router = express.Router();
router.post('/advice',advice);
router.post('/weather',weatherReport);
router.post('/createAlert',generateAlert);
router.post('/updateLocation',changeLocation);
router.post('/saveCheckList',saveCheckList);

export default router;