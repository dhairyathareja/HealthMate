
import express from "express";
import { loginController, logoutController, signUpController } from "../controller/auth.controller.js";
const Router = express.Router();

Router.post('/signup',signUpController);
Router.post('/login',loginController);
Router.post('/logout',logoutController);

export default Router;