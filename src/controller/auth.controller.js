import User from "../model/user.model.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import ErrorWrapper from "../utils/ErrorWrapper.js";
import axios from "axios"

const generateAccessAndRefreshToken=async(userId)=>{
    try {
        
        let user= await User.findOne({
            _id:userId
        })
    
        const accessToken=await user.generateAccessToken();
        const refreshToken= await user.generateRefreshToken();
        return {refreshToken,accessToken}

    } catch (error) {
        throw new ErrorHandler(501,`Error is While Generating Refresh And Access Token`);
    }
}

export const signUpController = ErrorWrapper(async (req,res,next) => {

    const {name,email,phone,password,city,age,disease,workType,mealsNumber} = req.body;  
    

    if(!name || !email || !phone || !password || !city || !age || !disease || !workType || !mealsNumber){
        throw new ErrorHandler(401,`Please Enter the details....`);
    }
    
    let regex = /^[a-z0-9]+@[a-z]+\.[a-z]{2,3}$/;
    let validEmail = regex.test(email);
    
    if(!validEmail){
        throw new ErrorHandler(401,`Please Enter a Valid Email `);
    }

    let existingUser = await User.findOne({email:email});
    if(existingUser){
        throw new ErrorHandler(400,`User Already Exists`);
    }

    const {data}= await axios.get(`http://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${process.env.OPEN_WEATHER_API}`)
    
    const location={
        city:city,
        country:data[0].country,
        state:data[0].state,
        lat:data[0].lat,
        lon:data[0].lon
    }

    const generalHealth={
        age:parseInt(age),
        disease,
        workType,
        mealsNumber:parseInt(mealsNumber)
    }

    try {
            

            let newUser= await User.create({
                name,
                email,
                phone,
                password,
                generalHealth,
                location
            });
            
            let user= await User.findOne({_id:newUser._id}).select('-password')
            
            const{accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id);
            user.refreshToken=refreshToken;
            await user.save()

            res.status(201)
            .cookie("RefreshToken",refreshToken).cookie("AccessToken",accessToken)
            .json({
                message: "SignUp Successful",
                user:user
            })    

        } catch (error) {
            throw new ErrorHandler(501,`Internal Server Error Found`);
        }    
    

    
})



export const loginController = ErrorWrapper(async (req,res,next) => {

    const{email,password}=req.body;

    if(!email || !password){
        throw new ErrorHandler(401,`Please Enter the Details`);
    }
    
    let user=await User.findOne({email:email});
    if(!user){
        throw new ErrorHandler(401,`User Does Not Exists`);
    }

    const checkPassword=await user.isPasswordCorrect(password)

    if(!checkPassword){
        throw new ErrorHandler(400,`Entered Password is not correct`);
    }

    const{accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id);
    user.refreshToken=refreshToken;
    await user.save();

    user= await User.findOne({_id:user._id}).select('-password');
    res.status(200)
       .cookie("RefreshToken",refreshToken).cookie("AccessToken",accessToken)
       .json({
        message:"Login Successful",
        user:user
    })


})

export const logoutController=ErrorWrapper(async (req,res,next) => {
    
    const{email}=req.body;

    if(!email){
        throw new ErrorHandler(401,`Cannot identify user`);
    }

    try {
        const user = await User.findOne({email:email});
        user.refreshToken="";
        await user.save();

        res.status(200)
        .cookie("RefreshToken","").cookie("AccessToken","")
        .json({
            message:"Logout Successful",
            success:true
        })    
    } catch (error) {
        throw new ErrorHandler(403,`Cannot Logout`);
    }
    

})