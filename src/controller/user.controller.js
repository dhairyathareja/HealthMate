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
    const {stress,water,bodyPain,headache,screenTime,sleepHours,food,exercise,alcohol,mood,email} = req.body;
    
    if ( !stress || !water || !bodyPain || !headache || !screenTime || !sleepHours || !food || !exercise || !alcohol || !mood || !email) {
      return res.status(400).json({ message: "Enter all the details" });
    }

    const ai = new GoogleGenAI({});
    
    const lat=req.user.location.lat;
    const lon=req.user.location.lon;
    const data=await weatherData(lat,lon);
    
    let weatherStr="[ ";
    
    for (const element in data) {
        weatherStr+=element+": "+data[element]+" ";
    }
    weatherStr+=" ]"
    
      
    const user=await User.findOne({email:email});
    
    const healthMsg=`Suggest me a healthy routine for rest of the day based on my curent condition in 12hr clock:- 
      Stress: ${stress}, water glasses drink: ${water},
      bodypain: ${bodyPain}, headach: ${headache},
      screenTime:${screenTime} hours, sleepHours:${sleepHours},
      food preference: ${food}, exercise: ${exercise}, 
      alcohol consumed: ${alcohol}, mood:${mood},
      age: ${user.generalHealth.age}, disease:${user.generalHealth.disease},
      workType: ${user.generalHealth.workType}, meals per day: ${user.generalHealth.mealsNumber}
      current weather: ${weatherStr}
    `;

    const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: healthMsg,
    });

    const currentHealth={
      date:Date.now(),
      water:parseInt(water),
      stress,
      bodyPain,
      headache,
      screenTime:parseInt(screenTime),
      sleepHours:parseInt(sleepHours),
      food,
      exercise,
      alcohol,
      mood,
      response:response.text
    }
    
    user.healthStatus.unshift(currentHealth);
    await user.save();
      

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
