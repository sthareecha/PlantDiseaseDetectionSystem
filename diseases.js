// Disease metadata used by the dashboard detection simulator
const DISEASES = {
  early_blight: {
    name: 'Early Blight',
    scientific: 'Alternaria solani',
    status: 'diseased',
    severity: 'Moderate',
    symptoms: [
      'Dark brown circular spots with concentric ring pattern',
      'Yellowing of leaf tissue surrounding the lesions',
      'Spots typically appear on older, lower leaves first',
      'Lesions may coalesce under heavy infection'
    ],
    treatment: [
      {
        title: 'Immediate actions',
        body: '<ul><li>Remove the lowest infected leaves (do not compost).</li><li>Mulch to reduce soil splash onto leaves.</li><li>Water at the base (avoid wet foliage).</li></ul>'
      },
      {
        title: 'Fungicide (if spreading)',
        body: '<ul><li>Use a fungicide labeled for tomato early blight (common actives include chlorothalonil, mancozeb, or copper).</li><li>Re-apply as per the product label, especially after rain/overhead watering.</li></ul>'
      },
      {
        title: 'Reduce disease pressure',
        body: '<ul><li>Increase spacing, stake/prune for airflow.</li><li>Rotate out of tomatoes/peppers/eggplant for 2–3 seasons.</li><li>Clean up crop residue at season end.</li></ul>'
      }
    ]
  },
  late_blight: {
    name: 'Late Blight',
    scientific: 'Phytophthora infestans',
    status: 'diseased',
    severity: 'Severe',
    symptoms: [
      'Water-soaked, irregularly shaped pale green or brown lesions',
      'White fuzzy mold visible on the underside of leaves in humid conditions',
      'Rapid browning and collapse of infected tissue',
      'Strong musty odour from affected plants'
    ],
    treatment: [
      {
        title: 'Act fast (high risk)',
        body: '<ul><li>Isolate the plant(s) if possible; avoid moving through the crop when leaves are wet.</li><li>Remove severely infected plants to slow spread.</li><li>Bag and discard infected material (do not compost).</li></ul>'
      },
      {
        title: 'Fungicide program',
        body: '<ul><li>Apply a fungicide labeled for late blight; protectants (e.g., chlorothalonil/mancozeb/copper) are commonly used, and some regions use systemic products depending on sensitivity.</li><li>Follow label intervals strictly during cool, wet weather.</li></ul>'
      },
      {
        title: 'Water & humidity',
        body: '<ul><li>Use drip irrigation; avoid overhead watering.</li><li>Improve airflow (staking/pruning) to dry foliage faster.</li></ul>'
      }
    ]
  },
  leaf_mold: {
    name: 'Leaf Mold',
    scientific: 'Fulvia fulva',
    status: 'diseased',
    severity: 'Mild',
    symptoms: [
      'Pale yellowish-green spots on the upper leaf surface',
      'Olive-green to grayish-brown fuzzy growth on the underside of leaves',
      'Affected leaves may curl upward and eventually drop',
      'Primarily affects greenhouse-grown tomatoes'
    ],
    treatment: [
      {
        title: 'Lower humidity (most important)',
        body: '<ul><li>Ventilate and reduce leaf wetness time (open vents, increase airflow).</li><li>Water early in the day; avoid overhead irrigation.</li></ul>'
      },
      {
        title: 'Sanitation',
        body: '<ul><li>Remove heavily infected leaves.</li><li>Clean up plant debris and disinfect tools if moving between plants.</li></ul>'
      },
      {
        title: 'Fungicide (if needed)',
        body: '<ul><li>Use a labeled fungicide for leaf mold (commonly chlorothalonil/mancozeb/copper, depending on local label).</li><li>Apply on a schedule per label until conditions improve.</li></ul>'
      }
    ]
  },
  septoria_leaf_spot: {
    name: 'Septoria Leaf Spot',
    scientific: 'Septoria lycopersici',
    status: 'diseased',
    severity: 'Moderate',
    symptoms: [
      'Small, circular spots with dark borders and light gray or white centers',
      'Tiny dark pycnidia (fruiting bodies) visible inside the lesions',
      'Symptoms first appear on lower, older leaves',
      'Rapid defoliation under severe infection'
    ],
    treatment: [
      {
        title: 'Limit spread',
        body: '<ul><li>Remove the most infected lower leaves first.</li><li>Mulch to reduce soil splash.</li><li>Water at the base and avoid working plants when wet.</li></ul>'
      },
      {
        title: 'Fungicide protection',
        body: '<ul><li>Use a fungicide labeled for Septoria leaf spot (often chlorothalonil/mancozeb/copper).</li><li>Apply per label; coverage is important on the underside of leaves.</li></ul>'
      },
      {
        title: 'Next season prevention',
        body: '<ul><li>Rotate away from solanaceous crops for 2+ seasons.</li><li>Remove tomato debris after harvest.</li></ul>'
      }
    ]
  },
  bacterial_spot: {
    name: 'Bacterial Spot',
    scientific: 'Xanthomonas perforans',
    status: 'diseased',
    severity: 'Moderate',
    symptoms: [
      'Small, water-soaked spots that turn dark brown to black',
      'Spots often have a yellow halo around the lesion',
      'Affected tissue may fall out, creating a shot-hole appearance',
      'Affects leaves, stems, and fruit'
    ],
    treatment: [
      {
        title: 'Reduce leaf wetness',
        body: '<ul><li>Switch to drip irrigation; avoid overhead watering.</li><li>Avoid handling plants when wet to prevent spread.</li></ul>'
      },
      {
        title: 'Copper-based sprays',
        body: '<ul><li>Copper products can help slow bacterial spot; some programs combine copper with a labeled protectant as per local guidance.</li><li>Re-apply per label, especially after rain.</li></ul>'
      },
      {
        title: 'Planting material & hygiene',
        body: '<ul><li>Use certified disease-free seed/transplants.</li><li>Disinfect tools and stakes; remove and discard heavily infected leaves.</li></ul>'
      }
    ]
  },
  spider_mites: {
    name: 'Spider Mite Damage',
    scientific: 'Tetranychus urticae',
    status: 'diseased',
    severity: 'Mild to Moderate',
    symptoms: [
      'Tiny yellow or white stippling or speckling on the upper leaf surface',
      'Fine silky webbing on the undersides of leaves',
      'Leaves become bronzed, dry, and eventually drop',
      'Damage worse in hot, dry conditions'
    ],
    treatment: [
      {
        title: 'Confirm & knock down',
        body: '<ul><li>Check leaf undersides for mites and webbing.</li><li>Rinse undersides with a strong water spray (repeat every few days).</li></ul>'
      },
      {
        title: 'Low-tox options',
        body: '<ul><li>Use insecticidal soap or horticultural oil; coat undersides well.</li><li>Test on a small area first to avoid leaf burn, especially in heat.</li></ul>'
      },
      {
        title: 'Miticides / biological control',
        body: '<ul><li>If severe, use a labeled miticide and rotate modes of action to reduce resistance.</li><li>In protected cultivation, predatory mites can be effective.</li></ul>'
      },
      {
        title: 'Reduce stress',
        body: '<ul><li>Avoid drought stress and excessive nitrogen.</li><li>Reduce dust; keep weeds down (they can host mites).</li></ul>'
      }
    ]
  },
  target_spot: {
    name: 'Target Spot',
    scientific: 'Corynespora cassiicola',
    status: 'diseased',
    severity: 'Moderate',
    symptoms: [
      'Circular brown lesions with concentric light and dark rings',
      'Lesions may have a yellow halo and dark center',
      'Affects leaves, stems, and fruit surfaces',
      'Infection spreads rapidly in warm, humid weather'
    ],
    treatment: [
      {
        title: 'Cultural control',
        body: '<ul><li>Prune infected leaves and improve airflow (stake/trellis).</li><li>Use drip irrigation; avoid wet foliage.</li><li>Remove crop debris after harvest.</li></ul>'
      },
      {
        title: 'Fungicide rotation',
        body: '<ul><li>Use a labeled fungicide program and rotate actives/modes of action to reduce resistance.</li><li>Ensure good coverage; re-apply per label during humid weather.</li></ul>'
      }
    ]
  },
  mosaic_virus: {
    name: 'Tomato Mosaic Virus',
    scientific: 'Tomato mosaic virus (ToMV)',
    status: 'diseased',
    severity: 'Severe',
    symptoms: [
      'Mosaic pattern of light and dark green areas on leaves',
      'Leaf distortion, curling, and stunted growth',
      'Fruit may show yellow spots or uneven ripening',
      'Spread through contact, contaminated tools, or infected seed'
    ],
    treatment: [
      {
        title: 'No cure — remove sources',
        body: '<ul><li>Remove and discard infected plants to reduce spread.</li><li>Do not compost infected plant material.</li></ul>'
      },
      {
        title: 'Hygiene is critical',
        body: '<ul><li>Disinfect tools and hands after handling plants (use an appropriate disinfectant).</li><li>Avoid tobacco handling around tomatoes (some mosaic viruses spread via contact).</li></ul>'
      },
      {
        title: 'Prevention',
        body: '<ul><li>Use resistant varieties when available.</li><li>Start with certified clean seed/transplants.</li></ul>'
      }
    ]
  },
  yellow_leaf_curl: {
    name: 'Yellow Leaf Curl Virus',
    scientific: 'Tomato yellow leaf curl virus (TYLCV)',
    status: 'diseased',
    severity: 'Severe',
    symptoms: [
      'Upward curling and yellowing of young leaves',
      'Leaves are small, crinkled, and leathery',
      'Plants show severe stunting and reduced fruit set',
      'Transmitted by the silverleaf whitefly'
    ],
    treatment: [
      {
        title: 'No cure — protect the crop',
        body: '<ul><li>Remove infected plants early to reduce virus spread.</li><li>Control the whitefly vector (they transmit TYLCV).</li></ul>'
      },
      {
        title: 'Whitefly management',
        body: '<ul><li>Use insect exclusion (fine mesh) where possible.</li><li>Use yellow sticky traps to monitor.</li><li>If using insecticides, rotate labeled actives to slow resistance.</li></ul>'
      },
      {
        title: 'Prevention',
        body: '<ul><li>Use TYLCV-resistant varieties when available.</li><li>Use reflective mulch and keep weeds down (they can host whiteflies).</li></ul>'
      }
    ]
  },
  healthy: {
    name: 'Healthy Leaf',
    scientific: 'No pathogen detected',
    status: 'healthy',
    severity: 'None',
    symptoms: [
      'Uniform deep green coloration across the leaf surface',
      'No lesions, spots, or discoloration observed',
      'Leaf shape and texture appear normal',
      'No signs of pest activity or mechanical damage'
    ],
    treatment: [
      {
        title: 'Keep doing what works',
        body: '<ul><li>Continue weekly scouting (check both sides of leaves).</li><li>Water at the base and avoid prolonged leaf wetness.</li><li>Maintain balanced nutrition and avoid over-fertilizing with nitrogen.</li></ul>'
      },
      {
        title: 'Prevention basics',
        body: '<ul><li>Sanitation: remove lower leaves touching soil and clean up debris.</li><li>Spacing/staking for airflow.</li><li>Use mulch to reduce soil splash.</li></ul>'
      }
    ]
  }
};

// Class labels used by the trained PlantVillage Tomato model
// (used to map model output -> UI disease metadata)
const MODEL_CLASS_TO_KEY = {
  'Tomato___Bacterial_spot': 'bacterial_spot',
  'Tomato___Early_blight': 'early_blight',
  'Tomato___Late_blight': 'late_blight',
  'Tomato___Leaf_Mold': 'leaf_mold',
  'Tomato___Septoria_leaf_spot': 'septoria_leaf_spot',
  'Tomato___Spider_mites Two-spotted_spider_mite': 'spider_mites',
  'Tomato___Target_Spot': 'target_spot',
  'Tomato___Tomato_mosaic_virus': 'mosaic_virus',
  'Tomato___Tomato_Yellow_Leaf_Curl_Virus': 'yellow_leaf_curl',
  'Tomato___healthy': 'healthy'
};

const DISEASE_KEYS = Object.values(MODEL_CLASS_TO_KEY);
