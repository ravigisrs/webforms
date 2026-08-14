const router=require("express").Router();
const bcrypt=require("bcryptjs");
const fs=require("fs");
const path=require("path");
const multer=require("multer");
const {pool}=require("../config/db");
const {requireAdmin}=require("../middleware/auth");

const uploadDir=path.join(__dirname,"..","public","uploads","projects");
fs.mkdirSync(uploadDir,{recursive:true});
const storage=multer.diskStorage({
  destination:(req,file,cb)=>cb(null,uploadDir),
  filename:(req,file,cb)=>{
    const ext=path.extname(file.originalname).toLowerCase();
    const base=path.basename(file.originalname,ext).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"project-image";
    cb(null,`${Date.now()}-${base}${ext}`);
  }
});
const imageUpload=multer({
  storage,
  limits:{fileSize:5*1024*1024},
  fileFilter:(req,file,cb)=>{
    const ok=["image/jpeg","image/png","image/webp"].includes(file.mimetype);
    cb(ok?null:new Error("Only JPG, PNG and WEBP images are allowed."),ok);
  }
});

function slugify(value){return String(value||"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"item";}
async function uniqueSlug(title,id=null,table="services"){
  const base=slugify(title); let slug=base,i=2;
  while(true){
    const q=id
      ? await pool.query(`SELECT id FROM ${table} WHERE slug=$1 AND id<>$2 LIMIT 1`,[slug,id])
      : await pool.query(`SELECT id FROM ${table} WHERE slug=$1 LIMIT 1`,[slug]);
    if(!q.rows.length) return slug;
    slug=`${base}-${i++}`;
  }
}

router.get("/login",(req,res)=>{if(req.session.admin)return res.redirect("/admin");res.render("admin/login",{title:"Admin Login",layout:"layouts/admin"});});
router.post("/login",async(req,res)=>{const r=await pool.query("SELECT * FROM users WHERE email=$1 AND is_active=true LIMIT 1",[req.body.email]);if(!r.rows.length||!(await bcrypt.compare(req.body.password,r.rows[0].password_hash)))return res.status(401).render("admin/login",{title:"Admin Login",layout:"layouts/admin",error:"Invalid email or password."});const u=r.rows[0];req.session.admin={id:u.id,name:u.name,email:u.email,role:u.role};res.redirect("/admin");});
router.get("/logout",(req,res)=>req.session.destroy(()=>res.redirect("/admin/login")));

router.get("/",requireAdmin,async(req,res)=>{const q=await Promise.all([pool.query("SELECT COUNT(*)::int count FROM services"),pool.query("SELECT COUNT(*)::int count FROM projects"),pool.query("SELECT COUNT(*)::int count FROM contact_enquiries"),pool.query("SELECT COUNT(*)::int count FROM equipment")]);res.render("admin/dashboard",{title:"HGC Admin Dashboard",layout:"layouts/admin",admin:req.session.admin,counts:{services:q[0].rows[0].count,projects:q[1].rows[0].count,enquiries:q[2].rows[0].count,equipment:q[3].rows[0].count}});});

/* HOME PAGE CMS */
router.get("/homepage",requireAdmin,async(req,res)=>{const r=await pool.query("SELECT * FROM homepage_content WHERE id=1");res.render("admin/homepage",{title:"Homepage Content",layout:"layouts/admin",admin:req.session.admin,home:r.rows[0]||{},saved:req.query.saved});});
router.post("/homepage",requireAdmin,async(req,res)=>{const b=req.body;await pool.query(`UPDATE homepage_content SET hero_kicker=$1,hero_title=$2,hero_highlight=$3,hero_description=$4,stat1_title=$5,stat1_text=$6,stat2_title=$7,stat2_text=$8,stat3_title=$9,stat3_text=$10,stat4_title=$11,stat4_text=$12,about_label=$13,about_title=$14,about_text1=$15,about_text2=$16,about_card_title=$17,about_card_text=$18,gis_label=$19,gis_title=$20,gis_description=$21,cta_label=$22,cta_title=$23,cta_description=$24,updated_at=now() WHERE id=1`,[b.hero_kicker,b.hero_title,b.hero_highlight,b.hero_description,b.stat1_title,b.stat1_text,b.stat2_title,b.stat2_text,b.stat3_title,b.stat3_text,b.stat4_title,b.stat4_text,b.about_label,b.about_title,b.about_text1,b.about_text2,b.about_card_title,b.about_card_text,b.gis_label,b.gis_title,b.gis_description,b.cta_label,b.cta_title,b.cta_description]);res.redirect("/admin/homepage?saved=1");});

/* SERVICES CMS */
router.get("/services",requireAdmin,async(req,res)=>{const [services,categories]=await Promise.all([pool.query(`SELECT s.*,sc.name category_name FROM services s LEFT JOIN service_categories sc ON sc.id=s.category_id ORDER BY s.display_order,s.id`),pool.query("SELECT * FROM service_categories ORDER BY name")]);res.render("admin/services",{title:"Manage Services",layout:"layouts/admin",admin:req.session.admin,services:services.rows,categories:categories.rows,saved:req.query.saved,deleted:req.query.deleted});});
router.get("/services/new",requireAdmin,async(req,res)=>{const categories=await pool.query("SELECT * FROM service_categories ORDER BY name");res.render("admin/service-form",{title:"Add Service",layout:"layouts/admin",admin:req.session.admin,service:{is_active:true,is_featured:false,display_order:0},categories:categories.rows,mode:"create"});});
router.post("/services",requireAdmin,async(req,res)=>{const b=req.body;const slug=await uniqueSlug(b.title,null,"services");await pool.query(`INSERT INTO services(category_id,title,slug,short_description,description,image,icon,display_order,is_featured,is_active,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())`,[b.category_id||null,b.title,slug,b.short_description||"",b.description||"",b.image||"",b.icon||"bi-map",Number(b.display_order)||0,b.is_featured==="on",b.is_active==="on"]);res.redirect("/admin/services?saved=1");});
router.get("/services/:id/edit",requireAdmin,async(req,res)=>{const [service,categories]=await Promise.all([pool.query("SELECT * FROM services WHERE id=$1",[req.params.id]),pool.query("SELECT * FROM service_categories ORDER BY name")]);if(!service.rows.length)return res.status(404).send("Service not found");res.render("admin/service-form",{title:"Edit Service",layout:"layouts/admin",admin:req.session.admin,service:service.rows[0],categories:categories.rows,mode:"edit"});});
router.post("/services/:id",requireAdmin,async(req,res)=>{const b=req.body;const slug=await uniqueSlug(b.title,req.params.id,"services");await pool.query(`UPDATE services SET category_id=$1,title=$2,slug=$3,short_description=$4,description=$5,image=$6,icon=$7,display_order=$8,is_featured=$9,is_active=$10,updated_at=now() WHERE id=$11`,[b.category_id||null,b.title,slug,b.short_description||"",b.description||"",b.image||"",b.icon||"bi-map",Number(b.display_order)||0,b.is_featured==="on",b.is_active==="on",req.params.id]);res.redirect("/admin/services?saved=1");});
router.post("/services/:id/delete",requireAdmin,async(req,res)=>{await pool.query("DELETE FROM services WHERE id=$1",[req.params.id]);res.redirect("/admin/services?deleted=1");});
router.post("/services/:id/toggle",requireAdmin,async(req,res)=>{await pool.query("UPDATE services SET is_active=NOT is_active,updated_at=now() WHERE id=$1",[req.params.id]);res.redirect("/admin/services");});

/* PROJECTS CMS */
router.get("/projects",requireAdmin,async(req,res)=>{const [projects,categories]=await Promise.all([pool.query(`SELECT p.*,pc.name category_name,(SELECT COUNT(*) FROM project_images pi WHERE pi.project_id=p.id)::int image_count FROM projects p LEFT JOIN project_categories pc ON pc.id=p.category_id ORDER BY p.created_at DESC,p.id DESC`),pool.query("SELECT * FROM project_categories ORDER BY name")]);res.render("admin/projects",{title:"Manage Projects",layout:"layouts/admin",admin:req.session.admin,projects:projects.rows,categories:categories.rows,saved:req.query.saved,deleted:req.query.deleted});});
router.get("/projects/new",requireAdmin,async(req,res)=>{const categories=await pool.query("SELECT * FROM project_categories ORDER BY name");res.render("admin/project-form",{title:"Add Project",layout:"layouts/admin",admin:req.session.admin,project:{is_active:true,is_featured:false},categories:categories.rows,mode:"create"});});
router.post("/projects",requireAdmin,imageUpload.single("cover_image"),async(req,res)=>{const b=req.body;const slug=await uniqueSlug(b.title,null,"projects");const cover=req.file?`/uploads/projects/${req.file.filename}`:(b.existing_cover||"");await pool.query(`INSERT INTO projects(category_id,title,slug,client_name,location,description,technology,project_date,cover_image,latitude,longitude,is_featured,is_active,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now())`,[b.category_id||null,b.title,slug,b.client_name||"",b.location||"",b.description||"",b.technology||"",b.project_date||null,cover,b.latitude?Number(b.latitude):null,b.longitude?Number(b.longitude):null,b.is_featured==="on",b.is_active!==undefined?b.is_active==="on":true]);res.redirect("/admin/projects?saved=1");});
router.get("/projects/:id/edit",requireAdmin,async(req,res)=>{const [project,categories,images]=await Promise.all([pool.query("SELECT * FROM projects WHERE id=$1",[req.params.id]),pool.query("SELECT * FROM project_categories ORDER BY name"),pool.query("SELECT * FROM project_images WHERE project_id=$1 ORDER BY display_order,id",[req.params.id])]);if(!project.rows.length)return res.status(404).send("Project not found");res.render("admin/project-form",{title:"Edit Project",layout:"layouts/admin",admin:req.session.admin,project:project.rows[0],categories:categories.rows,images:images.rows,mode:"edit"});});
router.post("/projects/:id",requireAdmin,imageUpload.single("cover_image"),async(req,res)=>{const b=req.body;const slug=await uniqueSlug(b.title,req.params.id,"projects");let cover=b.existing_cover||"";if(req.file)cover=`/uploads/projects/${req.file.filename}`;await pool.query(`UPDATE projects SET category_id=$1,title=$2,slug=$3,client_name=$4,location=$5,description=$6,technology=$7,project_date=$8,cover_image=$9,latitude=$10,longitude=$11,is_featured=$12,is_active=$13,updated_at=now() WHERE id=$14`,[b.category_id||null,b.title,slug,b.client_name||"",b.location||"",b.description||"",b.technology||"",b.project_date||null,cover,b.latitude?Number(b.latitude):null,b.longitude?Number(b.longitude):null,b.is_featured==="on",b.is_active==="on",req.params.id]);res.redirect(`/admin/projects/${req.params.id}/edit?saved=1`);});
router.post("/projects/:id/delete",requireAdmin,async(req,res)=>{await pool.query("DELETE FROM projects WHERE id=$1",[req.params.id]);res.redirect("/admin/projects?deleted=1");});
router.post("/projects/:id/toggle",requireAdmin,async(req,res)=>{await pool.query("UPDATE projects SET is_active=NOT is_active,updated_at=now() WHERE id=$1",[req.params.id]);res.redirect("/admin/projects");});
router.post("/projects/:id/images",requireAdmin,imageUpload.array("images",20),async(req,res)=>{for(let i=0;i<(req.files||[]).length;i++){const f=req.files[i];await pool.query("INSERT INTO project_images(project_id,image_path,caption,display_order) VALUES($1,$2,$3,$4)",[req.params.id,`/uploads/projects/${f.filename}`,req.body.caption||"",i]);}res.redirect(`/admin/projects/${req.params.id}/edit?saved=1`);});
router.post("/projects/images/:imageId/delete",requireAdmin,async(req,res)=>{const r=await pool.query("DELETE FROM project_images WHERE id=$1 RETURNING project_id,image_path",[req.params.imageId]);if(r.rows.length){const file=path.join(__dirname,"..","public",String(r.rows[0].image_path).replace(/^\//,""));try{fs.unlinkSync(file);}catch(e){}}res.redirect(`/admin/projects/${r.rows[0]?.project_id||""}/edit`);});


/* GALLERY CMS */
const galleryDir=path.join(__dirname,"..","public","uploads","gallery");
fs.mkdirSync(galleryDir,{recursive:true});
const galleryStorage=multer.diskStorage({destination:(req,file,cb)=>cb(null,galleryDir),filename:(req,file,cb)=>{const ext=path.extname(file.originalname).toLowerCase();const base=path.basename(file.originalname,ext).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"gallery-image";cb(null,`${Date.now()}-${base}${ext}`);}});
const galleryUpload=multer({storage:galleryStorage,limits:{fileSize:5*1024*1024},fileFilter:(req,file,cb)=>{const ok=["image/jpeg","image/png","image/webp"].includes(file.mimetype);cb(ok?null:new Error("Only JPG, PNG and WEBP images are allowed."),ok);}});
router.get("/gallery",requireAdmin,async(req,res)=>{const r=await pool.query("SELECT * FROM gallery ORDER BY display_order,id DESC");res.render("admin/gallery",{title:"Gallery",layout:"layouts/admin",admin:req.session.admin,images:r.rows,saved:req.query.saved,deleted:req.query.deleted});});
router.post("/gallery/upload",requireAdmin,galleryUpload.array("images",30),async(req,res)=>{const files=req.files||[];for(let i=0;i<files.length;i++){const f=files[i];await pool.query("INSERT INTO gallery(title,image_path,category,caption,display_order,is_active) VALUES($1,$2,$3,$4,$5,$6)",[req.body.title||f.originalname,`/uploads/gallery/${f.filename}`,req.body.category||"GIS",req.body.caption||"",Number(req.body.display_order)||i,true]);}res.redirect("/admin/gallery?saved=1");});
router.post("/gallery/:id/delete",requireAdmin,async(req,res)=>{const r=await pool.query("DELETE FROM gallery WHERE id=$1 RETURNING image_path",[req.params.id]);if(r.rows.length){const file=path.join(__dirname,"..","public",String(r.rows[0].image_path).replace(/^\//,""));try{fs.unlinkSync(file);}catch(e){}}res.redirect("/admin/gallery?deleted=1");});
router.post("/gallery/:id/toggle",requireAdmin,async(req,res)=>{await pool.query("UPDATE gallery SET is_active=NOT is_active WHERE id=$1",[req.params.id]);res.redirect("/admin/gallery");});

/* ENQUIRIES CMS */
router.get("/enquiries",requireAdmin,async(req,res)=>{const r=await pool.query(`SELECT e.*,s.title service_name FROM contact_enquiries e LEFT JOIN services s ON s.id=e.service_id ORDER BY e.created_at DESC,e.id DESC`);res.render("admin/enquiries",{title:"Enquiries",layout:"layouts/admin",admin:req.session.admin,enquiries:r.rows,deleted:req.query.deleted});});
router.get("/enquiries/:id",requireAdmin,async(req,res)=>{const r=await pool.query(`SELECT e.*,s.title service_name FROM contact_enquiries e LEFT JOIN services s ON s.id=e.service_id WHERE e.id=$1`,[req.params.id]);if(!r.rows.length)return res.status(404).send("Enquiry not found");res.render("admin/enquiry-detail",{title:"Enquiry Details",layout:"layouts/admin",admin:req.session.admin,enquiry:r.rows[0]});});
router.post("/enquiries/:id/status",requireAdmin,async(req,res)=>{const allowed=["new","contacted","closed"];const status=allowed.includes(req.body.status)?req.body.status:"new";await pool.query("UPDATE contact_enquiries SET status=$1 WHERE id=$2",[status,req.params.id]);res.redirect(`/admin/enquiries/${req.params.id}`);});
router.post("/enquiries/:id/delete",requireAdmin,async(req,res)=>{await pool.query("DELETE FROM contact_enquiries WHERE id=$1",[req.params.id]);res.redirect("/admin/enquiries?deleted=1");});

module.exports=router;
