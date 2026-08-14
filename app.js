require("dotenv").config();
const express=require("express"), path=require("path"), session=require("express-session"), helmet=require("helmet"), layouts=require("express-ejs-layouts");
const {initDatabase,ensureAdmin}=require("./config/db");
const publicRoutes=require("./routes/public"), adminRoutes=require("./routes/admin");

const app=express();
const PORT=process.env.PORT||3000;

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(layouts);
app.set("layout","layouts/main");

app.use(helmet({contentSecurityPolicy:false}));
app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(express.static(path.join(__dirname,"public")));

app.use(session({
  secret:process.env.SESSION_SECRET||"change-me",
  resave:false,
  saveUninitialized:false,
  cookie:{httpOnly:true,sameSite:"lax",secure:false,maxAge:28800000}
}));

app.locals.company={
  name:"Himalayan Geomatics Consultants",
  shortName:"HGC",
  email:"himalayangeomatics@gmail.com",
  phone1:"9418104846",
  phone2:"7018148115",
  address:"#569, Rampur Saurseri, Mahadev Colony, Surajpur, Panchkula, Haryana - 133301"
};

app.use("/",publicRoutes);
app.use("/admin",adminRoutes);

app.use((req,res)=>res.status(404).render("404",{
  title:"Page Not Found",
  message:"The requested page could not be found."
}));

(async()=>{
  try{
    await initDatabase();
    await ensureAdmin();
    app.listen(PORT,()=>console.log(`HGC: http://localhost:${PORT} | Admin: http://localhost:${PORT}/admin/login`));
  }catch(e){
    console.error(e);
    process.exit(1);
  }
})();
