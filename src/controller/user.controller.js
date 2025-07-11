import User from "../model/user.model.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import ErrorWrapper from "../utils/ErrorWrapper.js";
import { GoogleGenAI } from "@google/genai";
import axios from "axios"

const weatherData=async(lat,lon)=>{
    
  const{data}=await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.OPEN_WEATHER_API}`)

  const response={    
    description:data.weather[0].main,
    temperature:parseInt(parseInt(data.main.temp)-273.15),
    humidity:data.main.humidity,
    pressure:data.main.pressure,
    visibility:data.visibility,
    wind:data.wind.speed
  }

  return response;

}

export const weatherReport= ErrorWrapper(async (req,res,next)=>{

  const lat=req.user.location.lat;
  const lon=req.user.location.lon;


  const data=await weatherData(lat,lon);
  
  res.status(200).json({
    message:"Weather Fetched Successfully",
    data:data
  })

})

export const advice= ErrorWrapper(async (req,res,next) => {
    
    
    try {
    const {temperature,water,healthRating,moodRating,query,email} = req.body;
    
    if ( !temperature || !water || !healthRating || !moodRating || !email) {
      return res.status(400).json({ message: "Enter all the details" });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    let healthRatingValue="";
    
    switch (parseInt(healthRating)) {
      case 1:
        healthRatingValue="Worst"
        break;
      case 2:
        healthRatingValue="Not better"
        break;
      case 3:
        healthRatingValue="Average"
        break;
      case 4:
        healthRatingValue="Feeling healthy"
        break;
      case 5:
        healthRatingValue="healthy and energetic"
        break;   
      default:
        healthRatingValue="confused"
        break;
    }
    
    let moodRatingValue="";
    switch (parseInt(moodRating)) {
      case 1:
        moodRatingValue="Worst"
        break;
      case 2:
        moodRatingValue="unhappy"
        break;
      case 3:
        moodRatingValue="Average"
        break;
      case 4:
        moodRatingValue="happy"
        break;
      case 5:
        moodRatingValue="happy and exited"
        break;   
      default:
        moodRatingValue="confused"
        break;
    }

    const lat=req.user.location.lat;
    const lon=req.user.location.lon;
    const data=await weatherData(lat,lon);
    
    let weatherStr="[ ";
    
    for (const element in data) {
        weatherStr+=element+": "+data[element]+" ";
    }
    weatherStr+=" ]"
    
    let healthMsg=""
    if(query!=undefined){
      
      healthMsg=`My body Temperature is ${temperature} Fahrenheit and i've drink ${water} water glasses, my health is ${healthRatingValue} and mood is ${moodRatingValue} and i'm feeling like ${query} and my Surounding weather is ${weatherStr}. Suggest me a routine for rest of the day`;
    }
    else{
      healthMsg=`My body Temperature is ${temperature}+" Fahrenheit and i've drink ${water} water glasses, my health is ${healthRatingValue} and mood is ${moodRatingValue} and my Surounding weather is ${weatherStr}. Suggest me a routine for rest of the day`;
    }
    
    
    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: healthMsg,
    });


    const healthStatus={
      date:Date.now(),
      water:parseInt(water),
      healthRating:parseInt(healthRating),
      moodRating:parseInt(moodRating),
      temperature:parseFloat(temperature),
      query,
      response:response.text
    }

    try {
      
      const user=await User.findOne({email:email});
      user.healthStatus.unshift(healthStatus);
      await user.save();
    } catch (error) {
      throw new ErrorHandler(403,`Error in fetching User Details`);
    }

    res.status(200).json({
      message:"Suggestion Received",
      data:response.text
    })

  } catch (error) {
    res.status(500).send({ messsage: "Something went wrong",
      error
     });
  }

})

export const generateAlert= ErrorWrapper(async (req,res,next) => {

  const {data,email}=req.body;
  if(!data){
    throw new ErrorHandler(401,"Please tell your day routine");
  }

  const msg=`Following is my routine suggested by you, please tell me the important activities for which i should set an alarm in the json format with time(in 12:00 hr clock) as key and msg as the activity:- ${data}`;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: msg,
  });
  let responseData=response.text;
  let responseStr=responseData.substring(7,responseData.length-4);
  let jsonList=JSON.parse(responseStr);

  const checkList=[];

  for (const key in jsonList) {
    if (jsonList.hasOwnProperty(key)) {
      checkList.push({
        time:key,
        msg:jsonList[key],
        done:false
      })
    }
  }

  try {
    const user = await User.findOne({email:email});
    user.healthStatus[0].checklist=checkList;
    await user.save();
    res.status(200).json({
    message:"Response Received",
    user:user
  })
  } catch (error) {
    throw new ErrorHandler(401,`Error in Fetching User details`);
  }


  
  
})

export const changeLocation = ErrorWrapper(async (req,res,next) => {
  
  const {email,city}=req.body;

  if(!email || !city){
    throw new ErrorHandler(403,`Please enter the details`);
  }

  try {
    
    const {data}= await axios.get(`http://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${process.env.OPEN_WEATHER_API}`)
    
    const location={
        city:city,
        country:data[0].country,
        state:data[0].state,
        lat:data[0].lat,
        lon:data[0].lon
    }
  
    const user =await User.findOne({email:email});
    user.location=location;
    await user.save();
    res.status(200).json({
      message:"Location Changed",
      success:true,
      user:user
    })

  } catch (error) {
    throw new ErrorHandler(403,`Cannot change Location, try again later.`)
  }

})

export const saveCheckList = ErrorWrapper(async (req,res,next) => {
  
  const{email,checkArr}=req.body;
  

  if(!email || !checkArr){
    throw new ErrorHandler(405,`Please provide all the details`);
  }

  try {
    
    const user = await User.findOne({email:email});
    let index=0;
    
    user.healthStatus[0].checklist.forEach(element => {
      element.done=checkArr[index];
      index+=1;
    });
    await user.save();
    (user);

    res.status(200).json({
      message:"Done",
      success:true,
      user:user
    })

  } catch (error) {
    throw new ErrorHandler(402,`Error in Updating Checklist`);    
  }

})
