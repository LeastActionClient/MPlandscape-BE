import connectDB, { disconnectDB } from '../config/db.js';
import Admin from '../models/Admin.js';
import Service from '../models/Service.js';
import Gallery from '../models/Gallery.js';
import SiteSettings from '../models/SiteSettings.js';
import ENV from '../config/env.js';
import slugify from '../utils/slugify.js';

export const initialServices = [
  {
    title: 'Landscape Design & Development',
    slug: 'landscape-design-development',
    subtitle: 'Turnkey outdoor living spaces & masterplanned landscape construction',
    description:
      'We conceptualize and execute breathtaking landscape designs that fuse architectural precision with natural beauty. Our team oversees complete site grading, hardscape masonry, soil revitalization, and custom botanical curation to deliver turnkey outdoor living environments tailored for private villas, residential communities, and luxury resorts.',
    features: [
      '3D Landscape Architectural Visualizations',
      'Hardscape Masonry, Stone Pathways & Retaining Walls',
      'Custom Water Features, Fountains & Reflection Ponds',
      'Horticultural Soil Enrichment & Botanical Grading',
      'Native & Exotic Flora Planting Schemes',
      'Energy-efficient Ambient Outdoor Illumination',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80',
    displayOrder: 1,
    isActive: true,
    seoTitle: 'Professional Landscape Design & Development | MP Landscape Services',
    seoDescription: 'Transform your outdoor property with turnkey landscape architecture, hardscape construction, and horticultural mastery.',
  },
  {
    title: 'Agriculture & Farm Development',
    slug: 'agriculture-farm-development',
    subtitle: 'Precision agronomical layout & commercial farmland development',
    description:
      'Empowering landowners with sustainable, commercial-grade agricultural design. We specialize in transforming raw land into high-yielding agricultural ecosystems, integrating contour-conscious field planning, agro-forestry, high-density orchards, and ecological conservation methodologies.',
    features: [
      'Topographical Contour & Farmland Mapping',
      'Commercial Agro-Forestry & Timber Plantation Layouts',
      'High-Density Fruit Orchard Establishment',
      'Comprehensive Soil Health & Microbial Analysis',
      'Automated Farm Water Distribution Networks',
      'Eco-Friendly Windbreak & Living Fencing Solutions',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80',
    displayOrder: 2,
    isActive: true,
    seoTitle: 'Agriculture & Farmland Development Services | MP Landscape',
    seoDescription: 'Transform agricultural acreage into productive, sustainable farmlands with soil science, irrigation, and agro-forestry.',
  },
  {
    title: 'Irrigation Systems & Water Management',
    slug: 'irrigation-systems-water-management',
    subtitle: 'Smart water conservation & automated distribution systems',
    description:
      'Water efficiency is the heartbeat of flourishing landscapes. We design and install commercial-grade automated irrigation systems engineered for maximum hydration with minimal water consumption. Our smart systems utilize moisture sensors, weather-responsive automation, and targeted root-zone delivery.',
    features: [
      'Micro-Drip & Subsurface Root Irrigation Systems',
      'Pop-up Rotary Lawn Sprinkler Networks',
      'Smart Weather-Sensored Irrigation Controllers',
      'Rainwater Harvesting & Filtration Infrastructure',
      'Commercial Pumping Stations & Hydro-Pneumatic Systems',
      'Water Audit & Irrigation Retrofitting Services',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&w=1200&q=80',
    displayOrder: 3,
    isActive: true,
    seoTitle: 'Automated Irrigation & Water Management Solutions | MP Landscape',
    seoDescription: 'Save water and maximize vitality with smart automated drip irrigation, rain harvesting, and rotary sprinkler systems.',
  },
  {
    title: 'Landscape Architecture & Design Consultancy',
    slug: 'landscape-architecture-design-consultancy',
    subtitle: 'Environmental planning & architectural landscape master plans',
    description:
      'Our landscape architects provide rigorous advisory and environmental design consultancy. Working in close synergy with civil architects, estate developers, and corporate campuses, we draft comprehensive master plans that integrate microclimate cooling, native biodiversity, and sustainable site zoning.',
    features: [
      'Comprehensive Site Feasibility & Ecology Assessments',
      'Detailed 2D CAD & 3D BIM Architectural Schematics',
      'Microclimate Heat-Island Mitigation Strategies',
      'Stormwater Runoff & Bioswale Engineering',
      'Regulatory Environmental Compliance Documentation',
      'Project Phasing & Value Engineering Advisory',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    displayOrder: 4,
    isActive: true,
    seoTitle: 'Landscape Architecture & Design Consultancy | MP Landscape',
    seoDescription: 'Expert landscape architecture master planning, environmental consultancy, and 3D design for developers and luxury estates.',
  },
  {
    title: 'Landscape Maintenance & Garden Care',
    slug: 'landscape-maintenance-garden-care',
    subtitle: 'Comprehensive groundskeeping & horticultural preservation',
    description:
      'Sustaining perfection through disciplined horticultural stewardship. Our certified groundskeeping teams ensure pristine health, immaculate turf condition, and vibrant seasonal blooms across commercial parks, hospitality properties, and private residential estates.',
    features: [
      'Precision Turf Care, Aeration, De-thatching & Mowing',
      'Artistic Topiary, Hedge Trimming & Tree Surgery',
      'Customized Organic Fertilization Regimens',
      'Integrated Pest & Disease Management (IPM)',
      'Seasonal Flora Rotation & Flowerbed Refresh',
      'Bi-weekly Irrigation System Diagnostics & Cleaning',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1557429287-b2e26467fc2b?auto=format&fit=crop&w=1200&q=80',
    displayOrder: 5,
    isActive: true,
    seoTitle: 'Commercial & Estate Landscape Maintenance | MP Landscape',
    seoDescription: 'Dedicated grounds maintenance, turf aeration, organic plant nutrition, and horticultural care contracts.',
  },
  {
    title: 'Plant Supply, Nursery & Green Gifting Solutions',
    slug: 'plant-supply-nursery-green-gifting',
    subtitle: 'Acclimatized specimen trees, exotic shrubs & corporate greenery',
    description:
      'We cultivate a distinguished botanical catalog spanning mature architectural specimen trees, flowering shrubs, indoor palms, and air-purifying foliage. Additionally, our corporate green gifting wing supplies beautifully potted living arrangements that reflect environmental prestige.',
    features: [
      'Mature Specimen Shade & Ornamental Tree Sourcing',
      'Acclimatized Indoor Foliage & Biophilic Planters',
      'Custom Ceramic & Terrazzo Potting Collections',
      'Bespoke Corporate Green Gifting & Event Plant Hire',
      'Nutrient-Rich Horticultural Potting Media & Compost',
      'Doorstep Delivery & Professional On-site Installation',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=1200&q=80',
    displayOrder: 6,
    isActive: true,
    seoTitle: 'Plant Supply, Botanical Nursery & Green Gifting | MP Landscape',
    seoDescription: 'Source acclimatized specimen trees, ornamental shrubs, indoor biophilic plants, and sustainable corporate gifts.',
  },
  {
    title: 'Plant Import, Export & Horticultural Trading',
    slug: 'plant-import-export-horticultural-trading',
    subtitle: 'Global flora logistics & international phytosanitary compliance',
    description:
      'Bridging continents with premium horticultural specimens. We facilitate global botanical trade, handling quarantine protocols, phytosanitary verification, temperature-stabilized logistics, and custom procurement of rare flora from premier international growers worldwide.',
    features: [
      'Global Sourcing of Rare Palms & Exquisite Flora',
      'Strict Phytosanitary Documentation & Quarantine Handling',
      'Climate-Controlled International Air & Sea Transit',
      'Commercial Wholesale Nursery Supply & Distribution',
      'Custom Clearance & Botanical Health Compliance',
      'Post-Import Quarantine Acclimatization Facilities',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=1200&q=80',
    displayOrder: 7,
    isActive: true,
    seoTitle: 'Plant Import, Export & International Horticultural Trading | MP Landscape',
    seoDescription: 'International botanical logistics, rare plant import/export, phytosanitary compliance, and wholesale nursery trading.',
  },
];

export const initialGallery = [
  // Landscape Design
  {
    title: 'Luxury Villa Infinity Lawn & Terrace',
    category: 'Landscape Design',
    description: 'Multi-tiered outdoor terrace featuring natural stone masonry and perimeter palms.',
    imageUrl: 'https://images.unsplash.com/photo-1558904541-efa8c4a5af9b?auto=format&fit=crop&w=1000&q=80',
    displayOrder: 1,
    isActive: true,
  },
  {
    title: 'Contemporary Resort Water Pavilion',
    category: 'Landscape Design',
    description: 'Architectural reflection pool flanked by sculpted foliage and ambient night illumination.',
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80',
    displayOrder: 2,
    isActive: true,
  },
  {
    title: 'Minimalist Courtyard Zen Garden',
    category: 'Landscape Design',
    description: 'Dry-stone Japanese zen aesthetic balanced with native drought-tolerant greenery.',
    imageUrl: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=1000&q=80',
    displayOrder: 3,
    isActive: true,
  },
  // Agriculture & Farm Development
  {
    title: 'Contour Agro-Forestry Plantation',
    category: 'Agriculture & Farm Development',
    description: 'Terraced agro-forestry layout with integrated water collection channels.',
    imageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1000&q=80',
    displayOrder: 4,
    isActive: true,
  },
  {
    title: 'High-Density Citrus Orchard',
    category: 'Agriculture & Farm Development',
    description: 'Precision row planting with subsurface fertigation and organic ground cover.',
    imageUrl: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=1000&q=80',
    displayOrder: 5,
    isActive: true,
  },
  {
    title: 'Organic Vineyard & Olive Grove',
    category: 'Agriculture & Farm Development',
    description: 'Commercial vineyard master plan structured for mechanized harvesting and soil preservation.',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80',
    displayOrder: 6,
    isActive: true,
  },
  // Irrigation Systems
  {
    title: 'Smart Automated Drip Network',
    category: 'Irrigation Systems',
    description: 'Pressure-compensated drip emitters installed across an expansive agricultural estate.',
    imageUrl: 'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&w=1000&q=80',
    displayOrder: 7,
    isActive: true,
  },
  {
    title: 'Rotary Lawn Sprinkler Infrastructure',
    category: 'Irrigation Systems',
    description: 'Subterranean gear-driven rotors providing full head-to-head turf coverage.',
    imageUrl: 'https://images.unsplash.com/photo-1527842891421-42eec6e703ea?auto=format&fit=crop&w=1000&q=80',
    displayOrder: 8,
    isActive: true,
  },
  {
    title: 'Bio-retention Rain Garden & Basin',
    category: 'Irrigation Systems',
    description: 'Engineered stormwater catchment basin supporting native riparian plants.',
    imageUrl: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=1000&q=80',
    displayOrder: 9,
    isActive: true,
  },
  // Landscape Architecture
  {
    title: 'Corporate Campus Master Landscape',
    category: 'Landscape Architecture',
    description: 'Urban biophilic park integrated into modern high-tech corporate headquarters.',
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80',
    displayOrder: 10,
    isActive: true,
  },
  {
    title: 'Linear Rooftop Sky Garden',
    category: 'Landscape Architecture',
    description: 'Lightweight structural planting with wind-resistant foliage atop commercial tower.',
    imageUrl: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=1000&q=80',
    displayOrder: 11,
    isActive: true,
  },
  {
    title: 'Public Botanical Promenade',
    category: 'Landscape Architecture',
    description: 'Pedestrian boulevard bordered by native shade canopies and pervious stone pavers.',
    imageUrl: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=1000&q=80',
    displayOrder: 12,
    isActive: true,
  },
  // Garden Maintenance
  {
    title: 'Estate Heritage Lawn Restoration',
    category: 'Garden Maintenance',
    description: 'Immaculately manicured turf with laser-straight edging and healthy root aeration.',
    imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?auto=format&fit=crop&w=1000&q=80',
    displayOrder: 13,
    isActive: true,
  },
  {
    title: 'Formal French Topiary Gardens',
    category: 'Garden Maintenance',
    description: 'Surgically sculpted boxwood hedges and perennial borders maintained weekly.',
    imageUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1000&q=80',
    displayOrder: 14,
    isActive: true,
  },
  {
    title: 'Seasonal Perennial Color Beds',
    category: 'Garden Maintenance',
    description: 'Vibrant herbaceous borders refreshed with organic compost and seasonal blossoms.',
    imageUrl: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=1000&q=80',
    displayOrder: 15,
    isActive: true,
  },
  // Plant Supply & Nursery
  {
    title: 'Commercial Greenhouse Propagation',
    category: 'Plant Supply & Nursery',
    description: 'Climate-controlled automated nursery propagating ornamental and shade trees.',
    imageUrl: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=1000&q=80',
    displayOrder: 16,
    isActive: true,
  },
  {
    title: 'Mature Specimen Date Palms',
    category: 'Plant Supply & Nursery',
    description: 'Acclimatized mature palms prepared for luxury residential estate transplantation.',
    imageUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1000&q=80',
    displayOrder: 17,
    isActive: true,
  },
  {
    title: 'Biophilic Interior Living Planters',
    category: 'Plant Supply & Nursery',
    description: 'Monstera, Ficus, and Sansevieria installations in artisanal ceramic pots for offices.',
    imageUrl: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=1000&q=80',
    displayOrder: 18,
    isActive: true,
  },
  // Plant Trading
  {
    title: 'Exotic Horticultural Import Consignment',
    category: 'Plant Trading',
    description: 'Certified phytosanitary import of mature Mediterranean olive trees.',
    imageUrl: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=1000&q=80',
    displayOrder: 19,
    isActive: true,
  },
  {
    title: 'Rare Tropical Aroid Collection',
    category: 'Plant Trading',
    description: 'Specialist botanical trading and acclimatization of rare variegated species.',
    imageUrl: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=1000&q=80',
    displayOrder: 20,
    isActive: true,
  },
  {
    title: 'International Wholesale Nursery Bay',
    category: 'Plant Trading',
    description: 'Logistics consolidation center for export-ready containerized trees and shrubs.',
    imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1000&q=80',
    displayOrder: 21,
    isActive: true,
  },
];

export const seedDatabase = async () => {
  try {
    await connectDB();

    // 1. Seed/Verify Admin
    const email = ENV.ADMIN_EMAIL.toLowerCase().trim();
    let admin = await Admin.findOne({ email });
    if (!admin) {
      await Admin.create({
        name: ENV.ADMIN_NAME,
        email,
        password: ENV.ADMIN_PASSWORD,
        role: 'superadmin',
        isActive: true,
      });
      console.log(`✅ Superadmin created: ${email}`);
    }

    // 2. Seed/Verify SiteSettings
    await SiteSettings.getSettings();
    console.log(`✅ SiteSettings verified`);

    // 3. Seed Services if empty or missing
    const serviceCount = await Service.countDocuments();
    if (serviceCount === 0) {
      await Service.insertMany(initialServices);
      console.log(`✅ Initialized all 7 client services`);
    } else {
      console.log(`ℹ️ Services already exist (${serviceCount} records)`);
    }

    // 4. Seed Gallery if empty
    const galleryCount = await Gallery.countDocuments();
    if (galleryCount === 0) {
      await Gallery.insertMany(initialGallery);
      console.log(`✅ Initialized 21 high-definition gallery project records`);
    } else {
      console.log(`ℹ️ Gallery already exists (${galleryCount} records)`);
    }
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
  } finally {
    await disconnectDB();
  }
};

if (process.argv[1] && process.argv[1].endsWith('seedData.js')) {
  seedDatabase().then(() => process.exit(0));
}

export default seedDatabase;
