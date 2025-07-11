import User from "../model/user.model.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import ErrorWrapper from "../utils/ErrorWrapper.js";
import jwt from "jsonwebtoken";

export const verifyJWT=ErrorWrapper(async function (req,res,next){
    
    try {
        
        const incomingAccessToken=req.cookies.AccessToken;
        const incomingRefreshToken=req.cookies.RefreshToken;       

        if(incomingAccessToken === undefined || incomingRefreshToken === undefined){
            throw new ErrorHandler(401,`You are not Authorised to Access, Kindly Login First`);
        }

        if(!incomingAccessToken || !incomingRefreshToken){
            throw new ErrorHandler(401,`You are not Authorised to Access, Kindly Login First`);
        }

        let userInfo=jwt.verify(incomingAccessToken, process.env.ACCESS_TOKEN_KEY);

        let user=await User.findOne({_id:userInfo.userId});
        
        if(user.refreshToken !== incomingRefreshToken){
            throw new ErrorHandler(401,`You are not Authorised to Access, Kindly Login First`);
        }

        req.user=user;
        
        next();
    } catch (error) {
        throw new ErrorHandler(501,`Server Error While Logging, Contact Admin`);
    }
})