require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const CATALOGUE = [
  // ===== MAIZE =====
  {
    name: "Northern Leaf Blight", scientificName: "Exserohilum turcicum", type: "Disease",
    affectedCrops: "Maize", symptoms: "Long gray-green lesions on leaves,Leaf blighting",
    prevention: "Use resistant hybrids, crop rotation with non-host crops, and clean tillage.",
    treatment: "Apply triazole or strobilurin fungicides at first sign of lesions. Organic: use neem oil spray.",
    severity: "High", modelClassLabel: "Maize___Northern_Leaf_Blight", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/c/cb/Northern_leaf_blight_of_corn.jpg",
    imageAuthor: "USDA", imageLicence: "Public Domain", source: "CIMMYT", verified: true,
  },
  {
    name: "Common Rust", scientificName: "Puccinia sorghi", type: "Disease",
    affectedCrops: "Maize", symptoms: "Reddish-brown pustules on leaves,Leaf spots",
    prevention: "Plant resistant hybrids and avoid excessive nitrogen.",
    treatment: "Apply fungicides containing triazole or strobilurin when rust appears early.",
    severity: "Medium", modelClassLabel: "Maize___Common_Rust", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/45/Maize_rust_pustules.jpg",
    imageAuthor: "CIMMYT", imageLicence: "CC BY-SA 4.0", source: "CIMMYT", verified: true,
  },
  {
    name: "Fall Armyworm", scientificName: "Spodoptera frugiperda", type: "Pest",
    affectedCrops: "Maize,Sorghum,Rice,Wheat", symptoms: "Holes in leaves,Whorl damage,Frass on leaves",
    prevention: "Scout whorls twice weekly. Use pheromone traps for monitoring.",
    treatment: "Apply emamectin benzoate or chlorantraniliprole early. Organic: neem oil + ash mix in whorl.",
    severity: "High", modelClassLabel: "insect_fall_armyworm", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/44/Spodoptera_frugiperda_caterpillar.jpg",
    imageAuthor: "James Castner", imageLicence: "Public Domain", source: "USDA", verified: true,
  },

  // ===== BEANS =====
  {
    name: "Angular Leaf Spot", scientificName: "Pseudocercospora griseola", type: "Disease",
    affectedCrops: "Beans", symptoms: "Angular brown spots on leaves,Leaf yellowing",
    prevention: "Use certified disease-free seed and practice 2-year crop rotation.",
    treatment: "Apply copper-based fungicides or mancozeb at first symptoms.",
    severity: "Medium", modelClassLabel: "Bean___Angular_Leaf_Spot", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9c/Angular_leaf_spot_of_bean.jpg",
    imageAuthor: "CIAT", imageLicence: "CC BY-SA 3.0", source: "CIAT", verified: true,
  },
  {
    name: "Bean Rust", scientificName: "Uromyces appendiculatus", type: "Disease",
    affectedCrops: "Beans", symptoms: "Reddish-brown pustules on leaves,Leaf curling",
    prevention: "Use resistant varieties and avoid overhead irrigation.",
    treatment: "Apply sulfur or triazole fungicides. Organic: remove infected leaves promptly.",
    severity: "Medium", modelClassLabel: "Bean___Rust", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/4f/Bean_rust_pustules.jpg",
    imageAuthor: "INTA", imageLicence: "CC BY-SA 4.0", source: "CIAT", verified: true,
  },

  // ===== IRISH POTATO =====
  {
    name: "Late Blight", scientificName: "Phytophthora infestans", type: "Disease",
    affectedCrops: "Irish Potato,Tomato", symptoms: "Water-soaked lesions on leaves,White mold on underside,Leaf necrosis",
    prevention: "Use resistant varieties, ensure good drainage, avoid prolonged leaf wetness.",
    treatment: "Apply copper-based fungicide or metalaxyl at 7-day intervals under disease pressure.",
    severity: "High", modelClassLabel: "Potato___Late_Blight", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1f/Phytophthora_infestans_on_potato_leaf.jpg",
    imageAuthor: "Scot Nelson", imageLicence: "CC BY-SA 4.0", source: "University of Hawaii", verified: true,
  },
  {
    name: "Early Blight", scientificName: "Alternaria solani", type: "Disease",
    affectedCrops: "Irish Potato,Tomato", symptoms: "Target-like spots on leaves,Leaf yellowing",
    prevention: "Rotate crops, use disease-free seed, maintain proper plant spacing.",
    treatment: "Apply chlorothalonil or mancozeb preventatively. Remove affected leaves.",
    severity: "Medium", modelClassLabel: "Potato___Early_Blight", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/2/2b/Alternaria_solani_on_potato.jpg",
    imageAuthor: "University of Wisconsin", imageLicence: "CC BY-SA 3.0", source: "University of Wisconsin", verified: true,
  },
  {
    name: "Potato Aphid", scientificName: "Macrosiphum euphorbiae", type: "Pest",
    affectedCrops: "Irish Potato,Tomato", symptoms: "Stunted leaves,Sticky honeydew on leaves",
    prevention: "Monitor aphid populations weekly. Conserve natural predators.",
    treatment: "Apply selective insecticides at threshold. Organic: neem oil spray plus predator release.",
    severity: "Medium", modelClassLabel: "insect_potato_aphid", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Macrosiphum_euphorbiae.jpg",
    imageAuthor: "S. Rae", imageLicence: "CC BY 2.0", source: "University of California IPM", verified: true,
  },

  // ===== SWEET POTATO =====
  {
    name: "Sweet Potato Virus Disease", scientificName: "Sweet potato feathery mottle virus", type: "Disease",
    affectedCrops: "Sweet Potato", symptoms: "Leaf yellowing,Stunted growth,Mosaic patterns on leaves",
    prevention: "Use virus-free planting material. Control whitefly vectors.",
    treatment: "No chemical cure. Remove and destroy infected plants. Use resistant varieties.",
    severity: "High", modelClassLabel: "Sweet_Potato___Virus", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/8f/Sweet_potato_virus_symptoms.jpg",
    imageAuthor: "CIP", imageLicence: "CC BY-SA 4.0", source: "CIP", verified: true,
  },
  {
    name: "Sweet Potato Weevil", scientificName: "Cylas formicarius", type: "Pest",
    affectedCrops: "Sweet Potato", symptoms: "Holes in storage roots,Wilting vines,Yellow leaves",
    prevention: "Use healthy planting material. Practice crop rotation. Remove crop debris.",
    treatment: "Apply entomopathogenic nematodes or neem-based products. Remove infested plants.",
    severity: "High", modelClassLabel: "insect_sweet_potato_weevil", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f1/Cylas_formicarius.jpg",
    imageAuthor: "USDA ARS", imageLicence: "Public Domain", source: "USDA", verified: true,
  },

  // ===== CASSAVA =====
  {
    name: "Cassava Mosaic Disease", scientificName: "Cassava mosaic begomovirus", type: "Disease",
    affectedCrops: "Cassava", symptoms: "Yellow mosaic on leaves,Leaf distortion,Stunted growth",
    prevention: "Use disease-free cuttings. Control whitefly populations.",
    treatment: "No chemical cure. Remove infected plants. Plant resistant varieties.",
    severity: "High", modelClassLabel: "Cassava___Mosaic_Disease", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Cassava_mosaic_disease.jpg",
    imageAuthor: "IITA", imageLicence: "CC BY-SA 4.0", source: "IITA", verified: true,
  },
  {
    name: "Cassava Brown Streak Disease", scientificName: "Cassava brown streak virus", type: "Disease",
    affectedCrops: "Cassava", symptoms: "Brown necrotic lesions on stems,Leaf yellowing,Root necrosis",
    prevention: "Use certified virus-free cuttings. Practice crop rotation.",
    treatment: "No chemical cure. Remove infected plants. Use tolerant varieties where available.",
    severity: "High", modelClassLabel: "Cassava___Brown_Streak", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b5/Cassava_brown_streak.jpg",
    imageAuthor: "NARO", imageLicence: "CC BY-SA 4.0", source: "NARO Uganda", verified: true,
  },
  {
    name: "Cassava Green Mite", scientificName: "Mononychellus tanajoa", type: "Pest",
    affectedCrops: "Cassava", symptoms: "Leaf stippling,Bronzing of leaves,Leaf drop",
    prevention: "Use resistant varieties. Maintain soil moisture to reduce mite outbreaks.",
    treatment: "Apply acaricides when mites are severe. Organic: predatory mite release.",
    severity: "Medium", modelClassLabel: "insect_cassava_green_mite", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/6/67/Cassava_green_mite_damage.jpg",
    imageAuthor: "IITA", imageLicence: "CC BY-SA 4.0", source: "IITA", verified: true,
  },

  // ===== RICE =====
  {
    name: "Rice Blast", scientificName: "Magnaporthe oryzae", type: "Disease",
    affectedCrops: "Rice", symptoms: "Diamond-shaped lesions on leaves,White-gray centers,Leaf blighting",
    prevention: "Use resistant varieties. Avoid excessive nitrogen. Maintain proper water management.",
    treatment: "Apply tricyclazole or azoxystrobin fungicides preventatively.",
    severity: "High", modelClassLabel: "Rice___Blast", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Rice_blast_disease.jpg",
    imageAuthor: "IRRI", imageLicence: "CC BY-SA 4.0", source: "IRRI", verified: true,
  },
  {
    name: "Brown Spot", scientificName: "Bipolaris oryzae", type: "Disease",
    affectedCrops: "Rice", symptoms: "Brown oval spots on leaves,Leaf yellowing",
    prevention: "Use certified disease-free seed. Maintain balanced soil nutrients.",
    treatment: "Apply mancozeb or iprodione. Improve soil fertility to reduce susceptibility.",
    severity: "Medium", modelClassLabel: "Rice___Brown_Spot", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/8b/Rice_brown_spot.jpg",
    imageAuthor: "IRRI", imageLicence: "CC BY-SA 4.0", source: "IRRI", verified: true,
  },
  {
    name: "Rice Stem Borer", scientificName: "Chilo suppressalis", type: "Pest",
    affectedCrops: "Rice", symptoms: "Dead heart in tillers,White heads,Holes in stems",
    prevention: "Use light traps. Plant resistant varieties. Practice synchronized planting.",
    treatment: "Apply chlorantraniliprole or cartap. Biological: Trichogramma release.",
    severity: "High", modelClassLabel: "insect_rice_stem_borer", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d9/Chilo_suppressalis_larva.jpg",
    imageAuthor: "IRRI", imageLicence: "CC BY-SA 4.0", source: "IRRI", verified: true,
  },

  // ===== WHEAT =====
  {
    name: "Wheat Rust", scientificName: "Puccinia triticina", type: "Disease",
    affectedCrops: "Wheat", symptoms: "Orange-brown pustules on leaves,Leaf yellowing",
    prevention: "Plant resistant varieties. Remove volunteer wheat. Avoid late planting.",
    treatment: "Apply triazole fungicides at first sign of rust. Organic: sulfur powder.",
    severity: "High", modelClassLabel: "Wheat___Rust", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e2/Wheat_leaf_rust.jpg",
    imageAuthor: "CIMMYT", imageLicence: "CC BY-SA 4.0", source: "CIMMYT", verified: true,
  },
  {
    name: "Wheat Aphid", scientificName: "Sitobion avenae", type: "Pest",
    affectedCrops: "Wheat", symptoms: "Sticky leaves,Stunted growth,Honeydew on heads",
    prevention: "Conserve beneficial insects. Avoid excessive nitrogen fertilization.",
    treatment: "Apply selective aphicides at economic threshold. Organic: neem oil spray.",
    severity: "Medium", modelClassLabel: "insect_wheat_aphid", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/5/54/Sitobion_avenae_on_wheat.jpg",
    imageAuthor: "Rothamsted Research", imageLicence: "CC BY-SA 4.0", source: "Rothamsted Research", verified: true,
  },

  // ===== TOMATO =====
  {
    name: "Tomato Mosaic Virus", scientificName: "Tobacco mosaic virus", type: "Disease",
    affectedCrops: "Tomato", symptoms: "Mosaic leaf pattern,Leaf curling,Stunted fruit",
    prevention: "Use resistant varieties. Disinfect tools. Wash hands before handling plants.",
    treatment: "No chemical cure. Remove infected plants. Control weeds that harbor virus.",
    severity: "Medium", modelClassLabel: "Tomato___Tomato_Mosaic_Virus", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/49/Tomato_mosaic_virus.jpg",
    imageAuthor: "University of Florida", imageLicence: "CC BY-SA 3.0", source: "University of Florida", verified: true,
  },
  {
    name: "Tomato Leaf Miner", scientificName: "Liriomyza sativae", type: "Pest",
    affectedCrops: "Tomato", symptoms: "Serpentine mines on leaves,Leaf yellowing",
    prevention: "Use yellow sticky traps. Remove infected leaves early.",
    treatment: "Apply spinosad or abamectin. Biological: Diglyphus wasp release.",
    severity: "Medium", modelClassLabel: "insect_tomato_leafminer", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/7/78/Liriomyza_sativae_leaf_mines.jpg",
    imageAuthor: "Bugwood", imageLicence: "CC BY 3.0", source: "University of Georgia", verified: true,
  },

  // ===== BANANA =====
  {
    name: "Black Sigatoka", scientificName: "Pseudocercospora fijiensis", type: "Disease",
    affectedCrops: "Banana", symptoms: "Black streaks on leaves,Leaf yellowing,Reduced fruit yield",
    prevention: "Use disease-free planting material. Maintain proper plant spacing.",
    treatment: "Apply systemic fungicides (triazoles, strobilurins) alternating with protectants. Remove affected leaves.",
    severity: "High", modelClassLabel: "Banana___Black_Sigatoka", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/b/bf/Black_Sigatoka_on_banana.jpg",
    imageAuthor: "Bioversity International", imageLicence: "CC BY-SA 4.0", source: "Bioversity International", verified: true,
  },
  {
    name: "Banana Weevil", scientificName: "Cosmopolites sordidus", type: "Pest",
    affectedCrops: "Banana", symptoms: "Wilting plants,Tunnels in corm,Yellow leaves",
    prevention: "Use clean planting material. Remove crop residues. Trap using split pseudostems.",
    treatment: "Apply entomopathogenic nematodes or chlorpyrifos to the corm at planting.",
    severity: "High", modelClassLabel: "insect_banana_weevil", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/6/68/Cosmopolites_sordidus.jpg",
    imageAuthor: "Bioversity International", imageLicence: "CC BY-SA 4.0", source: "Bioversity International", verified: true,
  },

  // ===== COFFEE =====
  {
    name: "Coffee Leaf Rust", scientificName: "Hemileia vastatrix", type: "Disease",
    affectedCrops: "Coffee", symptoms: "Orange-yellow powdery spots on leaves,Leaf drop",
    prevention: "Plant resistant varieties. Maintain shade management. Improve air circulation.",
    treatment: "Apply copper-based fungicides or triazoles at 2-3 week intervals during rains.",
    severity: "High", modelClassLabel: "Coffee___Leaf_Rust", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/84/Hemileia_vastatrix_on_coffee.jpg",
    imageAuthor: "World Coffee Research", imageLicence: "CC BY-SA 4.0", source: "World Coffee Research", verified: true,
  },
  {
    name: "Coffee Berry Borer", scientificName: "Hypothenemus hampei", type: "Pest",
    affectedCrops: "Coffee", symptoms: "Holes in coffee berries,Berry drop,Reduced yield",
    prevention: "Strip remaining berries after harvest. Use biological control (Beauveria bassiana).",
    treatment: "Apply Beauveria bassiana biopesticide. Install pheromone traps for monitoring.",
    severity: "High", modelClassLabel: "insect_coffee_berry_borer", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7c/Hypothenemus_hampei_adult.jpg",
    imageAuthor: "World Coffee Research", imageLicence: "CC BY-SA 4.0", source: "World Coffee Research", verified: true,
  },

  // ===== SOYBEAN =====
  {
    name: "Soybean Rust", scientificName: "Phakopsora pachyrhizi", type: "Disease",
    affectedCrops: "Soybean", symptoms: "Small brown lesions on leaves,Leaf yellowing,Defoliation",
    prevention: "Plant early-maturing varieties. Scout regularly during flowering.",
    treatment: "Apply triazole or strobilurin fungicides at first detection.",
    severity: "High", modelClassLabel: "Soybean___Rust", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b5/Soybean_rust_symptoms.jpg",
    imageAuthor: "USDA ARS", imageLicence: "Public Domain", source: "USDA ARS", verified: true,
  },

  // ===== SORGHUM =====
  {
    name: "Sorghum Downy Mildew", scientificName: "Peronosclerospora sorghi", type: "Disease",
    affectedCrops: "Sorghum", symptoms: "White downy growth on leaves,Leaf striping,Stunted growth",
    prevention: "Use resistant hybrids. Practice crop rotation. Avoid early planting in high-risk areas.",
    treatment: "Apply metalaxyl seed treatment. Remove infected plants early.",
    severity: "Medium", modelClassLabel: "Sorghum___Downy_Mildew", recognitionSupported: true,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/5/56/Sorghum_downy_mildew.jpg",
    imageAuthor: "ICRISAT", imageLicence: "CC BY-SA 4.0", source: "ICRISAT", verified: true,
  },
];

async function main() {
  console.log("Seeding disease and pest catalogue...");
  let created = 0, skipped = 0;
  for (const entry of CATALOGUE) {
    const existing = await prisma.diseaseLibrary.findFirst({
      where: { name: entry.name, scientificName: entry.scientificName },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.diseaseLibrary.create({
      data: {
        ...entry,
        affectedCrops: entry.affectedCrops,
        symptoms: entry.symptoms,
        prevention: entry.prevention,
        treatment: entry.treatment,
        active: true,
      },
    });
    created++;
  }
  console.log(`Catalogue seeding complete: ${created} created, ${skipped} skipped.`);
  console.log(`Total records now: ${await prisma.diseaseLibrary.count()}`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
