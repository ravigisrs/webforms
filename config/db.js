const {Pool}=require("pg");
const fs=require("fs");
const path=require("path");
const bcrypt=require("bcryptjs");

const pool=new Pool({
  host:process.env.DB_HOST,
  port:process.env.DB_PORT||5432,
  database:process.env.DB_NAME,
  user:process.env.DB_USER,
  password:process.env.DB_PASSWORD
});

async function initDatabase(){
  const schema=fs.readFileSync(path.join(__dirname,"..","database","schema.sql"),"utf8");
  await pool.query(schema);
  console.log("Database ready.");
}

async function ensureAdmin(){
  const email=process.env.ADMIN_EMAIL||"admin@hgc.local";
  const pw=process.env.ADMIN_PASSWORD||"Admin@12345";
  const r=await pool.query("SELECT id FROM users WHERE email=$1 LIMIT 1",[email]);
  if(!r.rows.length){
    const h=await bcrypt.hash(pw,12);
    await pool.query(
      "INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'admin')",
      [process.env.ADMIN_NAME||"HGC Administrator",email,h]
    );
    console.log("Admin created:",email);
  }
}

module.exports={pool,initDatabase,ensureAdmin};
