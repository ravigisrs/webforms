CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE IF NOT EXISTS users(id SERIAL PRIMARY KEY,name VARCHAR(150) NOT NULL,email VARCHAR(255) UNIQUE NOT NULL,password_hash TEXT NOT NULL,role VARCHAR(30) DEFAULT 'admin',is_active BOOLEAN DEFAULT true,created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS service_categories(id SERIAL PRIMARY KEY,name VARCHAR(150) UNIQUE NOT NULL,slug VARCHAR(180) UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS services(id SERIAL PRIMARY KEY,category_id INT REFERENCES service_categories(id) ON DELETE SET NULL,title VARCHAR(200) NOT NULL,slug VARCHAR(220) UNIQUE NOT NULL,short_description TEXT,description TEXT,image VARCHAR(500),icon VARCHAR(100),display_order INT DEFAULT 0,is_featured BOOLEAN DEFAULT false,is_active BOOLEAN DEFAULT true,created_at TIMESTAMPTZ DEFAULT now(),updated_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS project_categories(id SERIAL PRIMARY KEY,name VARCHAR(150) UNIQUE NOT NULL,slug VARCHAR(180) UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS projects(id SERIAL PRIMARY KEY,category_id INT REFERENCES project_categories(id) ON DELETE SET NULL,title VARCHAR(250) NOT NULL,slug VARCHAR(280) UNIQUE NOT NULL,client_name VARCHAR(200),location VARCHAR(250),description TEXT,technology TEXT,project_date DATE,cover_image VARCHAR(500),latitude DOUBLE PRECISION,longitude DOUBLE PRECISION,boundary geometry(MultiPolygon,4326),is_featured BOOLEAN DEFAULT false,is_active BOOLEAN DEFAULT true,created_at TIMESTAMPTZ DEFAULT now(),updated_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS project_images(id SERIAL PRIMARY KEY,project_id INT REFERENCES projects(id) ON DELETE CASCADE,image_path VARCHAR(500) NOT NULL,caption VARCHAR(250),display_order INT DEFAULT 0);
CREATE TABLE IF NOT EXISTS equipment(id SERIAL PRIMARY KEY,name VARCHAR(200) NOT NULL,manufacturer VARCHAR(200),model VARCHAR(200),description TEXT,specifications TEXT,image VARCHAR(500),is_active BOOLEAN DEFAULT true,created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS team_members(id SERIAL PRIMARY KEY,name VARCHAR(200) NOT NULL,designation VARCHAR(200),qualification VARCHAR(300),bio TEXT,photo VARCHAR(500),display_order INT DEFAULT 0,is_active BOOLEAN DEFAULT true);
CREATE TABLE IF NOT EXISTS gallery(id SERIAL PRIMARY KEY,title VARCHAR(250),image_path VARCHAR(500) NOT NULL,category VARCHAR(150),caption TEXT,display_order INT DEFAULT 0,is_active BOOLEAN DEFAULT true,created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS blog_posts(id SERIAL PRIMARY KEY,title VARCHAR(250) NOT NULL,slug VARCHAR(280) UNIQUE NOT NULL,excerpt TEXT,content TEXT,cover_image VARCHAR(500),published_at TIMESTAMPTZ,is_published BOOLEAN DEFAULT false,created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS contact_enquiries(id SERIAL PRIMARY KEY,name VARCHAR(200) NOT NULL,email VARCHAR(255),mobile VARCHAR(30),company VARCHAR(200),service_id INT REFERENCES services(id) ON DELETE SET NULL,message TEXT,status VARCHAR(30) DEFAULT 'new',created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS gis_projects(id SERIAL PRIMARY KEY,project_id INT REFERENCES projects(id) ON DELETE CASCADE,map_title VARCHAR(250),latitude DOUBLE PRECISION,longitude DOUBLE PRECISION,zoom_level DOUBLE PRECISION DEFAULT 12,wms_url TEXT,wmts_url TEXT,geoserver_workspace VARCHAR(150),geoserver_layer VARCHAR(250),description TEXT,is_public BOOLEAN DEFAULT false,created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS gis_layers(id SERIAL PRIMARY KEY,name VARCHAR(250) NOT NULL,layer_type VARCHAR(50) DEFAULT 'WMS',service_url TEXT,layer_name VARCHAR(250),opacity NUMERIC(4,3) DEFAULT 1,display_order INT DEFAULT 0,is_active BOOLEAN DEFAULT true);
INSERT INTO service_categories(name,slug) VALUES ('GIS & Remote Sensing','gis-remote-sensing'),('Survey & Mapping','survey-mapping'),('Geotechnical & Hydro','geotechnical-hydro'),('Equipment & Calibration','equipment-calibration') ON CONFLICT DO NOTHING;
INSERT INTO services(category_id,title,slug,short_description,icon,display_order,is_featured) SELECT id,'GIS & Image Processing','gis-image-processing','GIS mapping, spatial analysis, remote sensing and image processing solutions.','bi-map',1,true FROM service_categories WHERE slug='gis-remote-sensing' ON CONFLICT DO NOTHING;
INSERT INTO services(category_id,title,slug,short_description,icon,display_order,is_featured) SELECT id,'DGPS / GPS Survey','dgps-gps-survey','High-accuracy DGPS and GPS survey services for mapping and engineering applications.','bi-crosshair',2,true FROM service_categories WHERE slug='survey-mapping' ON CONFLICT DO NOTHING;
INSERT INTO services(category_id,title,slug,short_description,icon,display_order,is_featured) SELECT id,'Total Station Survey','total-station-survey','Precision total station surveying for land, engineering and infrastructure projects.','bi-bullseye',3,true FROM service_categories WHERE slug='survey-mapping' ON CONFLICT DO NOTHING;
INSERT INTO services(category_id,title,slug,short_description,icon,display_order,is_featured) SELECT id,'LiDAR & Drone Survey','lidar-drone-survey','3D terrain mapping, UAV/drone survey and LiDAR-based spatial data acquisition.','bi-broadcast-pin',4,true FROM service_categories WHERE slug='gis-remote-sensing' ON CONFLICT DO NOTHING;
INSERT INTO services(category_id,title,slug,short_description,icon,display_order,is_featured) SELECT id,'Bathymetry Survey','bathymetry-survey','Hydrographic and bathymetric survey support for water and hydro projects.','bi-water',5,true FROM service_categories WHERE slug='geotechnical-hydro' ON CONFLICT DO NOTHING;
INSERT INTO services(category_id,title,slug,short_description,icon,display_order,is_featured) SELECT id,'Land Demarcation','land-demarcation','Land demarcation using DGPS and total station survey techniques.','bi-bounding-box',6,true FROM service_categories WHERE slug='survey-mapping' ON CONFLICT DO NOTHING;
INSERT INTO services(category_id,title,slug,short_description,icon,display_order,is_featured) SELECT id,'GPR Survey','gpr-survey','Ground penetrating radar survey support for subsurface investigation.','bi-layers',7,false FROM service_categories WHERE slug='geotechnical-hydro' ON CONFLICT DO NOTHING;
INSERT INTO services(category_id,title,slug,short_description,icon,display_order,is_featured) SELECT id,'Water Quality Testing','water-quality-testing','Water quality parameter testing and related field consultancy services.','bi-droplet',8,false FROM service_categories WHERE slug='geotechnical-hydro' ON CONFLICT DO NOTHING;
INSERT INTO project_categories(name,slug) VALUES ('GIS','gis'),('Survey','survey'),('Drone & LiDAR','drone-lidar'),('Hydro','hydro'),('Land Demarcation','land-demarcation') ON CONFLICT DO NOTHING;


-- =========================
-- PHASE 2 CMS TABLES
-- =========================
CREATE TABLE IF NOT EXISTS homepage_content(
  id INT PRIMARY KEY DEFAULT 1,
  hero_kicker VARCHAR(250) NOT NULL DEFAULT 'GEOMATICS • GIS • SURVEY • REMOTE SENSING',
  hero_title VARCHAR(300) NOT NULL DEFAULT 'Mapping the Future',
  hero_highlight VARCHAR(300) NOT NULL DEFAULT 'Through Geospatial Technology',
  hero_description TEXT,
  stat1_title VARCHAR(80) DEFAULT 'GIS',
  stat1_text VARCHAR(150) DEFAULT 'Mapping & Analysis',
  stat2_title VARCHAR(80) DEFAULT 'DGPS',
  stat2_text VARCHAR(150) DEFAULT 'High Accuracy Survey',
  stat3_title VARCHAR(80) DEFAULT 'LiDAR',
  stat3_text VARCHAR(150) DEFAULT '3D Spatial Mapping',
  stat4_title VARCHAR(80) DEFAULT 'UAV',
  stat4_text VARCHAR(150) DEFAULT 'Drone Survey',
  about_label VARCHAR(150) DEFAULT 'ABOUT HGC',
  about_title VARCHAR(300) DEFAULT 'Professional Geomatics & Geospatial Solutions',
  about_text1 TEXT,
  about_text2 TEXT,
  about_card_title VARCHAR(250) DEFAULT 'GIS + Survey + Remote Sensing',
  about_card_text TEXT,
  gis_label VARCHAR(150) DEFAULT 'GIS SOLUTIONS',
  gis_title VARCHAR(300) DEFAULT 'Interactive Geospatial Applications',
  gis_description TEXT,
  cta_label VARCHAR(150) DEFAULT 'LET''S WORK TOGETHER',
  cta_title VARCHAR(300) DEFAULT 'Have a Survey or GIS Project?',
  cta_description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO homepage_content(
 id,hero_kicker,hero_title,hero_highlight,hero_description,
 stat1_title,stat1_text,stat2_title,stat2_text,stat3_title,stat3_text,stat4_title,stat4_text,
 about_label,about_title,about_text1,about_text2,about_card_title,about_card_text,
 gis_label,gis_title,gis_description,cta_label,cta_title,cta_description
) VALUES (
 1,
 'GEOMATICS • GIS • SURVEY • REMOTE SENSING',
 'Mapping the Future',
 'Through Geospatial Technology',
 'Professional GIS, DGPS, Total Station, LiDAR, Drone, Bathymetry and Geomatics consultancy services.',
 'GIS','Mapping & Analysis',
 'DGPS','High Accuracy Survey',
 'LiDAR','3D Spatial Mapping',
 'UAV','Drone Survey',
 'ABOUT HGC',
 'Professional Geomatics & Geospatial Solutions',
 'Himalayan Geomatics Consultants provides professional geospatial, surveying, GIS, remote sensing and geomatics consultancy services for land, infrastructure, hydro and mapping projects.',
 'Our technical scope includes DGPS/GPS, Total Station, LiDAR, drone survey, bathymetry, land demarcation, GIS & image processing, GPR and water quality related services.',
 'GIS + Survey + Remote Sensing',
 'Integrated geospatial technology for accurate mapping, analysis and decision support.',
 'GIS SOLUTIONS',
 'Interactive Geospatial Applications',
 'Professional geospatial applications, web GIS, spatial databases, mapping and location intelligence solutions.',
 'LET''S WORK TOGETHER',
 'Have a Survey or GIS Project?',
 'Tell us about your project and our technical team can discuss the right geospatial solution.'
) ON CONFLICT (id) DO NOTHING;
