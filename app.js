if(process.env.NODE_ENV != "production"){
  require("dotenv").config();
}
console.log(process.env.SECRET);
const express = require ("express");
const app = express();
const mongoose = require("mongoose");
// const MONGO_URL = "mongodb://127.0.0.1:27017/elitestay";
const dbUrl = process.env.ATLASDB_URL;
const { data: sampleListings } = require("./init/data.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/reviews.js");
const userRouter = require("./routes/user.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const localStrategy = require("passport-local");
const User = require("./models/user.js");
main().
then(()=>{
    console.log("connected to DB");
}).catch((err)=>{
    console.log(err);
});
async function main(){
    await mongoose.connect(dbUrl);
}
app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine("ejs",ejsMate);
app.use(express.static(path.join(__dirname,"/public")));

// app.get("/",(req,res)=>{
//     res.send("Hi, I am root");
// });
const store = MongoStore.create({
    mongoUrl:dbUrl,
    crypto:{
        secret:process.env.SECRET
    },
    touchAfter: 24 * 3600,
});

store.on("error",()=>{
    console.log("ERROR IN MONGO SESSION STORE",err);
});

const sessionOptions={
    store,
    secret:process.env.SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        expires:Date.now()+7 * 24 * 60 * 60 * 1000,
        maxAge:7 * 24 * 60 * 60 * 1000,
        httpOnly : true, //cross scripting attacks security
    },
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
})
// app.get("/demoUser",async(req,res)=>{
//     let fakeUser =  new User({
//         email:"student@gmailcom",
//         username:"delta-student",
//     });
//     let registeredUser = await User.register(fakeUser,"helloworld");
//     res.send(registeredUser);
// });
app.use("/listings",listingRouter);
app.use("/listings/:id/reviews",reviewRouter);
app.use("/",userRouter);

app.all("*",(req,res,next)=>{
    next(new ExpressError(404,"Page Not Found!"));
});
app.use((err, req, res, next) =>{
    let{statusCode=500, message="Something went wrong!" } = err; // Deconstruct 
    res.status(statusCode).render("error.ejs",{ message });
    // res.status(statusCode).send(message);
    // res.send("something went wrong!");
});
app.use((req, res, next) => {
  res.locals.currUser = req.user || null; // make it always defined
  console.log('currUser in locals:', res.locals.currUser && res.locals.currUser.username);
  next();
});
const ListsearchRoutes = require("./routes/listing.js");
app.use("/listings",ListsearchRoutes);
app.listen(8080,() =>{
    console.log("server is listening at port 8080");
});
