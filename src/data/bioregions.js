// Bioregional Territory System
// Based on One Earth Bioregions 2023 + RESOLVE Ecoregions 2017
// See: bioregion_territories_spec.md for full documentation

// ============================================
// REALMS (8 total, 7 active)
// ============================================

export const REALMS = {
  NA: {
    code: 'NA',
    name: 'Nearctic',
    region: 'North America',
    color: '#4A90D9',
    primaryTypes: ['terra', 'social'],
    bounds: [[-170, 15], [-52, 72]], // [sw, ne] approximate
    description: 'North America including Mexico highlands and Caribbean',
  },
  PA: {
    code: 'PA',
    name: 'Palearctic',
    region: 'Europe & Northern Asia',
    color: '#7CB342',
    primaryTypes: ['nature', 'oracle'],
    bounds: [[-25, 25], [180, 80]],
    description: 'Europe, North Africa, and Asia north of the Himalayas',
  },
  NT: {
    code: 'NT',
    name: 'Neotropic',
    region: 'Central & South America',
    color: '#26A69A',
    primaryTypes: ['nature', 'flow'],
    bounds: [[-120, -56], [-34, 30]],
    description: 'Central and South America, including the Caribbean',
  },
  AT: {
    code: 'AT',
    name: 'Afrotropic',
    region: 'Sub-Saharan Africa',
    color: '#FF7043',
    primaryTypes: ['blaze', 'terra'],
    bounds: [[-18, -35], [52, 20]],
    description: 'Sub-Saharan Africa and Madagascar',
  },
  IM: {
    code: 'IM',
    name: 'Indomalayan',
    region: 'South & Southeast Asia',
    color: '#AB47BC',
    primaryTypes: ['flow', 'oracle'],
    bounds: [[60, -10], [150, 35]],
    description: 'Indian subcontinent and Southeast Asia',
  },
  AU: {
    code: 'AU',
    name: 'Australasian',
    region: 'Australia & New Guinea',
    color: '#EF5350',
    primaryTypes: ['blaze', 'grid'],
    bounds: [[110, -50], [180, 0]],
    description: 'Australia, New Guinea, New Zealand, and nearby islands',
  },
  OC: {
    code: 'OC',
    name: 'Oceanian',
    region: 'Pacific Islands',
    color: '#29B6F6',
    primaryTypes: ['flow', 'social'],
    bounds: [[130, -25], [-130, 25]],
    description: 'Pacific Islands including Hawaii, Polynesia, Micronesia',
  },
  AN: {
    code: 'AN',
    name: 'Antarctic',
    region: 'Antarctica',
    color: '#90A4AE',
    primaryTypes: [],
    bounds: [[-180, -90], [180, -60]],
    description: 'Antarctica and surrounding islands (inactive)',
    inactive: true,
  },
};

// ============================================
// SUBREALMS (52 total)
// ============================================

export const SUBREALMS = {
  // Nearctic (NA)
  'NA-WEST': { code: 'NA-WEST', name: 'Western North America', realm: 'NA' },
  'NA-EAST': { code: 'NA-EAST', name: 'Eastern North America', realm: 'NA' },
  'NA-CENTRAL': { code: 'NA-CENTRAL', name: 'Central North America', realm: 'NA' },
  'NA-NORTH': { code: 'NA-NORTH', name: 'Northern North America', realm: 'NA' },
  'NA-SOUTH': { code: 'NA-SOUTH', name: 'Southern North America', realm: 'NA' },
  'NA-ISLANDS': { code: 'NA-ISLANDS', name: 'North American Islands', realm: 'NA' },

  // Palearctic (PA)
  'PA-WEST': { code: 'PA-WEST', name: 'Western Palearctic', realm: 'PA' },
  'PA-CENTRAL': { code: 'PA-CENTRAL', name: 'Central Palearctic', realm: 'PA' },
  'PA-EAST': { code: 'PA-EAST', name: 'Eastern Palearctic', realm: 'PA' },
  'PA-NORTH': { code: 'PA-NORTH', name: 'Northern Palearctic', realm: 'PA' },
  'PA-SOUTH': { code: 'PA-SOUTH', name: 'Southern Palearctic', realm: 'PA' },

  // Neotropic (NT)
  'NT-AMAZON': { code: 'NT-AMAZON', name: 'Amazonia', realm: 'NT' },
  'NT-ANDES': { code: 'NT-ANDES', name: 'Andean', realm: 'NT' },
  'NT-ATLANTIC': { code: 'NT-ATLANTIC', name: 'Atlantic South America', realm: 'NT' },
  'NT-CARIBBEAN': { code: 'NT-CARIBBEAN', name: 'Caribbean', realm: 'NT' },
  'NT-CENTRAL': { code: 'NT-CENTRAL', name: 'Central America', realm: 'NT' },
  'NT-SOUTH': { code: 'NT-SOUTH', name: 'Southern South America', realm: 'NT' },

  // Afrotropic (AT)
  'AT-WEST': { code: 'AT-WEST', name: 'West Africa', realm: 'AT' },
  'AT-CENTRAL': { code: 'AT-CENTRAL', name: 'Central Africa', realm: 'AT' },
  'AT-EAST': { code: 'AT-EAST', name: 'East Africa', realm: 'AT' },
  'AT-SOUTH': { code: 'AT-SOUTH', name: 'Southern Africa', realm: 'AT' },
  'AT-MADAGASCAR': { code: 'AT-MADAGASCAR', name: 'Madagascar', realm: 'AT' },
  'AT-SAHEL': { code: 'AT-SAHEL', name: 'Sahel & Sahara', realm: 'AT' },

  // Indomalayan (IM)
  'IM-INDIA': { code: 'IM-INDIA', name: 'Indian Subcontinent', realm: 'IM' },
  'IM-INDOCHINA': { code: 'IM-INDOCHINA', name: 'Indochina', realm: 'IM' },
  'IM-MALESIA': { code: 'IM-MALESIA', name: 'Malesian', realm: 'IM' },
  'IM-HIMALAYA': { code: 'IM-HIMALAYA', name: 'Himalayan', realm: 'IM' },
  'IM-CHINA': { code: 'IM-CHINA', name: 'Southern China', realm: 'IM' },

  // Australasian (AU)
  'AU-AUSTRALIA': { code: 'AU-AUSTRALIA', name: 'Australia', realm: 'AU' },
  'AU-NEWGUINEA': { code: 'AU-NEWGUINEA', name: 'New Guinea', realm: 'AU' },
  'AU-NEWZEALAND': { code: 'AU-NEWZEALAND', name: 'New Zealand', realm: 'AU' },
  'AU-PACIFIC': { code: 'AU-PACIFIC', name: 'Southwest Pacific', realm: 'AU' },

  // Oceanian (OC)
  'OC-POLYNESIA': { code: 'OC-POLYNESIA', name: 'Polynesia', realm: 'OC' },
  'OC-MICRONESIA': { code: 'OC-MICRONESIA', name: 'Micronesia', realm: 'OC' },
  'OC-MELANESIA': { code: 'OC-MELANESIA', name: 'Melanesia', realm: 'OC' },
};

// ============================================
// BIOREGIONS (60 active)
// ============================================
// NOTE: The 'capital' field below indicates the DEFAULT type capital
// for display purposes only. Actual type capitals are determined
// dynamically by which territory of that type has the most staked SPIRIT.
// A territory becomes the type capital when it has the highest stake.

export const BIOREGIONS = {
  // ===== NEARCTIC (NA) - 10 Bioregions =====
  NA01: {
    id: 'NA01',
    name: 'Pacific Northwest & Cascadia',
    realm: 'NA',
    subrealm: 'NA-WEST',
    primaryType: 'nature',
    secondaryType: 'flow',
    center: [-122.5, 47.0],
    features: ['temperate_rainforest', 'ancient_cedars', 'salmon_runs'],
    capital: false,
    // RESOLVE ecoregion IDs that make up this bioregion
    ecoregionIds: ['NA0519', 'NA0520', 'NA0506', 'NA0524'],
  },
  NA02: {
    id: 'NA02',
    name: 'Greater Rockies & Mountain Forests',
    realm: 'NA',
    subrealm: 'NA-WEST',
    primaryType: 'terra',
    secondaryType: 'social',
    center: [-110.5, 44.0],
    features: ['alpine_peaks', 'geothermal', 'wildlife_corridors'],
    capital: false,
    ecoregionIds: ['NA0518', 'NA0517', 'NA0521'],
  },
  NA03: {
    id: 'NA03',
    name: 'California Coastal & Chaparral',
    realm: 'NA',
    subrealm: 'NA-WEST',
    primaryType: 'blaze',
    secondaryType: 'flow',
    center: [-121.5, 37.0],
    features: ['coastal_fog', 'chaparral', 'tech_hubs'],
    capital: false,
    ecoregionIds: ['NA1201', 'NA1202', 'NA0508'],
  },
  NA04: {
    id: 'NA04',
    name: 'Great Lakes & St. Lawrence',
    realm: 'NA',
    subrealm: 'NA-EAST',
    primaryType: 'flow',
    secondaryType: 'social',
    center: [-84.0, 45.0],
    features: ['freshwater_seas', 'boreal_transition', 'urban_centers'],
    capital: false,
    ecoregionIds: ['NA0401', 'NA0402', 'NA0415'],
  },
  NA05: {
    id: 'NA05',
    name: 'Appalachian Mixed Forests',
    realm: 'NA',
    subrealm: 'NA-EAST',
    primaryType: 'nature',
    secondaryType: 'social',
    center: [-82.0, 37.0],
    features: ['ancient_mountains', 'biodiversity_hotspot', 'fall_foliage'],
    capital: false,
    ecoregionIds: ['NA0403', 'NA0404', 'NA0405'],
  },
  NA06: {
    id: 'NA06',
    name: 'Florida Peninsula & Keys',
    realm: 'NA',
    subrealm: 'NA-SOUTH',
    primaryType: 'grid',
    secondaryType: 'flow',
    center: [-81.5, 27.0],
    features: ['lightning_alley', 'wetlands', 'coral_reefs'],
    capital: false,
    ecoregionIds: ['NA0512', 'NA0514', 'NT0904'],
  },
  NA07: {
    id: 'NA07',
    name: 'Sonoran & Mojave Deserts',
    realm: 'NA',
    subrealm: 'NA-SOUTH',
    primaryType: 'blaze',
    secondaryType: 'terra',
    center: [-112.0, 33.0],
    features: ['extreme_heat', 'saguaro', 'desert_adapted'],
    capital: false,
    ecoregionIds: ['NA1301', 'NA1302', 'NA1303'],
  },
  NA08: {
    id: 'NA08',
    name: 'Canadian Tundra & Boreal',
    realm: 'NA',
    subrealm: 'NA-NORTH',
    primaryType: 'social',
    secondaryType: 'flow',
    center: [-95.0, 60.0],
    features: ['permafrost', 'northern_lights', 'caribou_migration'],
    capital: false,
    ecoregionIds: ['NA0601', 'NA0602', 'NA1101'],
  },
  NA09: {
    id: 'NA09',
    name: 'Great Plains Prairies',
    realm: 'NA',
    subrealm: 'NA-CENTRAL',
    primaryType: 'social',
    secondaryType: 'terra',
    center: [-100.0, 42.0],
    features: ['grasslands', 'bison_range', 'tornado_alley'],
    capital: false,
    ecoregionIds: ['NA0801', 'NA0802', 'NA0803'],
  },
  NA10: {
    id: 'NA10',
    name: 'Hawaiian Islands',
    realm: 'NA',
    subrealm: 'NA-ISLANDS',
    primaryType: 'flow',
    secondaryType: 'blaze',
    center: [-155.5, 19.5],
    features: ['volcanic_islands', 'endemic_species', 'tropical_paradise'],
    capital: false,
    ecoregionIds: ['OC0106', 'OC0702'],
  },

  // ===== PALEARCTIC (PA) - 12 Bioregions =====
  PA01: {
    id: 'PA01',
    name: 'Western European Mixed Forests',
    realm: 'PA',
    subrealm: 'PA-WEST',
    primaryType: 'nature',
    secondaryType: 'social',
    center: [5.0, 48.0],
    features: ['ancient_forests', 'cultural_landscapes', 'urban_parks'],
    capital: false,
    ecoregionIds: ['PA0429', 'PA0430', 'PA0445'],
  },
  PA02: {
    id: 'PA02',
    name: 'Mediterranean Basin',
    realm: 'PA',
    subrealm: 'PA-SOUTH',
    primaryType: 'blaze',
    secondaryType: 'nature',
    center: [15.0, 40.0],
    features: ['volcanic_activity', 'olive_groves', 'ancient_ruins'],
    capital: false,
    ecoregionIds: ['PA1201', 'PA1202', 'PA1214'],
  },
  PA03: {
    id: 'PA03',
    name: 'Alps & Central European Highlands',
    realm: 'PA',
    subrealm: 'PA-CENTRAL',
    primaryType: 'terra',
    secondaryType: 'nature',
    center: [10.0, 47.0],
    features: ['alpine_peaks', 'glaciers', 'mountain_culture'],
    capital: false,
    ecoregionIds: ['PA0501', 'PA0502', 'PA0503'],
  },
  PA04: {
    id: 'PA04',
    name: 'Scandinavian & North Atlantic',
    realm: 'PA',
    subrealm: 'PA-NORTH',
    primaryType: 'flow',
    secondaryType: 'grid',
    center: [10.0, 62.0],
    features: ['fjords', 'northern_lights', 'renewable_energy'],
    capital: false,
    ecoregionIds: ['PA0601', 'PA0602', 'PA1102'],
  },
  PA05: {
    id: 'PA05',
    name: 'British Isles Temperate',
    realm: 'PA',
    subrealm: 'PA-WEST',
    primaryType: 'oracle',
    secondaryType: 'social',
    center: [-2.0, 54.0],
    features: ['ancient_sites', 'moors', 'coastal_cliffs'],
    capital: false,
    ecoregionIds: ['PA0409', 'PA0421', 'PA0501'],
  },
  PA06: {
    id: 'PA06',
    name: 'Eastern European Plains',
    realm: 'PA',
    subrealm: 'PA-CENTRAL',
    primaryType: 'social',
    secondaryType: 'nature',
    center: [30.0, 50.0],
    features: ['steppes', 'river_plains', 'agricultural'],
    capital: false,
    ecoregionIds: ['PA0410', 'PA0411', 'PA0801'],
  },
  PA07: {
    id: 'PA07',
    name: 'Siberian Taiga',
    realm: 'PA',
    subrealm: 'PA-NORTH',
    primaryType: 'social',
    secondaryType: 'flow',
    center: [105.0, 55.0],
    features: ['boreal_forest', 'permafrost', 'ancient_lake'],
    capital: false,
    ecoregionIds: ['PA0601', 'PA0602', 'PA0603'],
  },
  PA08: {
    id: 'PA08',
    name: 'Central Asian Steppes',
    realm: 'PA',
    subrealm: 'PA-CENTRAL',
    primaryType: 'terra',
    secondaryType: 'blaze',
    center: [68.0, 45.0],
    features: ['vast_steppes', 'silk_road', 'nomadic_heritage'],
    capital: false,
    ecoregionIds: ['PA0802', 'PA0803', 'PA1301'],
  },
  PA09: {
    id: 'PA09',
    name: 'Japanese Archipelago',
    realm: 'PA',
    subrealm: 'PA-EAST',
    primaryType: 'grid',
    secondaryType: 'nature',
    center: [138.0, 36.0],
    features: ['volcanic_islands', 'ancient_forests', 'tech_culture'],
    capital: false,
    ecoregionIds: ['PA0501', 'PA0502', 'PA0439'],
  },
  PA10: {
    id: 'PA10',
    name: 'Korean Peninsula & Manchuria',
    realm: 'PA',
    subrealm: 'PA-EAST',
    primaryType: 'terra',
    secondaryType: 'nature',
    center: [127.0, 38.0],
    features: ['mountain_forests', 'dmz_wilderness', 'temperate'],
    capital: false,
    ecoregionIds: ['PA0421', 'PA0422', 'PA0423'],
  },
  PA11: {
    id: 'PA11',
    name: 'Tibetan Plateau',
    realm: 'PA',
    subrealm: 'PA-SOUTH',
    primaryType: 'oracle',
    secondaryType: 'terra',
    center: [90.0, 32.0],
    features: ['high_altitude', 'sacred_mountains', 'spiritual_center'],
    capital: true, // Oracle capital
    ecoregionIds: ['PA1001', 'PA1002', 'PA1003'],
  },
  PA12: {
    id: 'PA12',
    name: 'Middle Eastern Deserts',
    realm: 'PA',
    subrealm: 'PA-SOUTH',
    primaryType: 'blaze',
    secondaryType: 'oracle',
    center: [45.0, 28.0],
    features: ['extreme_desert', 'ancient_civilizations', 'oil_wealth'],
    capital: false,
    ecoregionIds: ['PA1301', 'PA1302', 'PA1303'],
  },

  // ===== NEOTROPIC (NT) - 10 Bioregions =====
  NT01: {
    id: 'NT01',
    name: 'Amazon Basin Rainforests',
    realm: 'NT',
    subrealm: 'NT-AMAZON',
    primaryType: 'nature',
    secondaryType: 'flow',
    center: [-62.0, -3.0],
    features: ['largest_rainforest', 'biodiversity_hotspot', 'river_network'],
    capital: true, // Nature capital
    ecoregionIds: ['NT0101', 'NT0102', 'NT0103'],
  },
  NT02: {
    id: 'NT02',
    name: 'Amazon River & Estuary',
    realm: 'NT',
    subrealm: 'NT-AMAZON',
    primaryType: 'flow',
    secondaryType: 'nature',
    center: [-52.0, -1.0],
    features: ['river_dolphins', 'mangroves', 'tidal_bore'],
    capital: false,
    ecoregionIds: ['NT0104', 'NT0902'],
  },
  NT03: {
    id: 'NT03',
    name: 'Atlantic Brazilian Forests',
    realm: 'NT',
    subrealm: 'NT-ATLANTIC',
    primaryType: 'nature',
    secondaryType: 'social',
    center: [-43.0, -22.0],
    features: ['mata_atlantica', 'endemic_species', 'coastal_mountains'],
    capital: false,
    ecoregionIds: ['NT0104', 'NT0105', 'NT0106'],
  },
  NT04: {
    id: 'NT04',
    name: 'Cerrado Savannas',
    realm: 'NT',
    subrealm: 'NT-ATLANTIC',
    primaryType: 'blaze',
    secondaryType: 'nature',
    center: [-48.0, -15.0],
    features: ['savanna', 'fire_adapted', 'agricultural_frontier'],
    capital: false,
    ecoregionIds: ['NT0704', 'NT0705'],
  },
  NT05: {
    id: 'NT05',
    name: 'Andean Mountain Forests',
    realm: 'NT',
    subrealm: 'NT-ANDES',
    primaryType: 'terra',
    secondaryType: 'oracle',
    center: [-72.0, -13.0],
    features: ['cloud_forests', 'ancient_ruins', 'high_altitude'],
    capital: false,
    ecoregionIds: ['NT0150', 'NT0151', 'NT0152'],
  },
  NT06: {
    id: 'NT06',
    name: 'Patagonian Steppe & Glaciers',
    realm: 'NT',
    subrealm: 'NT-SOUTH',
    primaryType: 'flow',
    secondaryType: 'terra',
    center: [-70.0, -48.0],
    features: ['glaciers', 'windswept_plains', 'penguin_colonies'],
    capital: false,
    ecoregionIds: ['NT0801', 'NT0802', 'NT0501'],
  },
  NT07: {
    id: 'NT07',
    name: 'Caribbean Islands',
    realm: 'NT',
    subrealm: 'NT-CARIBBEAN',
    primaryType: 'flow',
    secondaryType: 'social',
    center: [-66.0, 18.0],
    features: ['tropical_islands', 'coral_reefs', 'hurricane_belt'],
    capital: false,
    ecoregionIds: ['NT0904', 'NT0905', 'NT0906'],
  },
  NT08: {
    id: 'NT08',
    name: 'Central American Forests',
    realm: 'NT',
    subrealm: 'NT-CENTRAL',
    primaryType: 'nature',
    secondaryType: 'flow',
    center: [-84.0, 10.0],
    features: ['cloud_forests', 'biodiversity_corridor', 'volcanic'],
    capital: false,
    ecoregionIds: ['NT0108', 'NT0109', 'NT0110'],
  },
  NT09: {
    id: 'NT09',
    name: 'Venezuelan Tepuis & Orinoco',
    realm: 'NT',
    subrealm: 'NT-AMAZON',
    primaryType: 'grid',
    secondaryType: 'flow',
    center: [-66.0, 6.0],
    features: ['table_mountains', 'eternal_lightning', 'angel_falls'],
    capital: true, // Grid capital
    ecoregionIds: ['NT0107', 'NT0163'],
  },
  NT10: {
    id: 'NT10',
    name: 'Galapagos Islands',
    realm: 'NT',
    subrealm: 'NT-SOUTH',
    primaryType: 'social',
    secondaryType: 'flow',
    center: [-90.5, -0.5],
    features: ['evolution_laboratory', 'endemic_species', 'volcanic'],
    capital: true, // Social capital
    ecoregionIds: ['NT1001'],
  },

  // ===== AFROTROPIC (AT) - 8 Bioregions =====
  AT01: {
    id: 'AT01',
    name: 'Congo Basin Rainforests',
    realm: 'AT',
    subrealm: 'AT-CENTRAL',
    primaryType: 'nature',
    secondaryType: 'flow',
    center: [20.0, 0.0],
    features: ['second_largest_rainforest', 'great_apes', 'congo_river'],
    capital: false,
    ecoregionIds: ['AT0101', 'AT0102', 'AT0103'],
  },
  AT02: {
    id: 'AT02',
    name: 'East African Savannas',
    realm: 'AT',
    subrealm: 'AT-EAST',
    primaryType: 'blaze',
    secondaryType: 'terra',
    center: [36.0, -3.0],
    features: ['serengeti', 'great_migration', 'rift_valley'],
    capital: false,
    ecoregionIds: ['AT0701', 'AT0702', 'AT0703'],
  },
  AT03: {
    id: 'AT03',
    name: 'Madagascar Island',
    realm: 'AT',
    subrealm: 'AT-MADAGASCAR',
    primaryType: 'oracle',
    secondaryType: 'nature',
    center: [47.0, -19.0],
    features: ['endemic_90_percent', 'lemurs', 'baobabs'],
    capital: false,
    ecoregionIds: ['AT0201', 'AT0202', 'AT0203'],
  },
  AT04: {
    id: 'AT04',
    name: 'Greater Sahara',
    realm: 'AT',
    subrealm: 'AT-SAHEL',
    primaryType: 'blaze',
    secondaryType: 'oracle',
    center: [-5.0, 23.0],
    features: ['largest_hot_desert', 'ancient_trade_routes', 'eye_of_sahara'],
    capital: false,
    ecoregionIds: ['PA1301', 'PA1302'], // Sahara spans PA/AT
  },
  AT05: {
    id: 'AT05',
    name: 'Ethiopian Highlands',
    realm: 'AT',
    subrealm: 'AT-EAST',
    primaryType: 'terra',
    secondaryType: 'nature',
    center: [38.0, 9.0],
    features: ['roof_of_africa', 'endemic_wolves', 'ancient_christianity'],
    capital: false,
    ecoregionIds: ['AT0401', 'AT0402', 'AT0501'],
  },
  AT06: {
    id: 'AT06',
    name: 'Kalahari & Namib Deserts',
    realm: 'AT',
    subrealm: 'AT-SOUTH',
    primaryType: 'blaze',
    secondaryType: 'social',
    center: [20.0, -24.0],
    features: ['oldest_desert', 'skeleton_coast', 'desert_adapted'],
    capital: false,
    ecoregionIds: ['AT1301', 'AT1302', 'AT1303'],
  },
  AT07: {
    id: 'AT07',
    name: 'Cape Floristic Region',
    realm: 'AT',
    subrealm: 'AT-SOUTH',
    primaryType: 'nature',
    secondaryType: 'blaze',
    center: [19.0, -34.0],
    features: ['fynbos', 'smallest_floral_kingdom', 'biodiversity_hotspot'],
    capital: false,
    ecoregionIds: ['AT1201', 'AT1202'],
  },
  AT08: {
    id: 'AT08',
    name: 'West African Forests',
    realm: 'AT',
    subrealm: 'AT-WEST',
    primaryType: 'nature',
    secondaryType: 'flow',
    center: [0.0, 6.0],
    features: ['guinean_forests', 'coastal_mangroves', 'cultural_diversity'],
    capital: false,
    ecoregionIds: ['AT0104', 'AT0105', 'AT0106'],
  },

  // ===== INDOMALAYAN (IM) - 10 Bioregions =====
  IM01: {
    id: 'IM01',
    name: 'Himalayan Alpine & Foothills',
    realm: 'IM',
    subrealm: 'IM-HIMALAYA',
    primaryType: 'terra',
    secondaryType: 'oracle',
    center: [86.0, 28.0],
    features: ['highest_peaks', 'sacred_mountains', 'snow_leopards'],
    capital: true, // Terra capital
    ecoregionIds: ['IM0401', 'IM0402', 'IM0403'],
  },
  IM02: {
    id: 'IM02',
    name: 'Ganges & Brahmaputra Plains',
    realm: 'IM',
    subrealm: 'IM-INDIA',
    primaryType: 'flow',
    secondaryType: 'oracle',
    center: [83.0, 26.0],
    features: ['sacred_rivers', 'fertile_plains', 'spiritual_centers'],
    capital: false,
    ecoregionIds: ['IM0701', 'IM0702'],
  },
  IM03: {
    id: 'IM03',
    name: 'Indian Peninsula',
    realm: 'IM',
    subrealm: 'IM-INDIA',
    primaryType: 'blaze',
    secondaryType: 'social',
    center: [78.0, 18.0],
    features: ['deccan_plateau', 'western_ghats', 'monsoon'],
    capital: false,
    ecoregionIds: ['IM0301', 'IM0302', 'IM0303'],
  },
  IM04: {
    id: 'IM04',
    name: 'Sri Lankan Highlands',
    realm: 'IM',
    subrealm: 'IM-INDIA',
    primaryType: 'nature',
    secondaryType: 'flow',
    center: [80.5, 7.5],
    features: ['tea_plantations', 'rainforests', 'endemic_species'],
    capital: false,
    ecoregionIds: ['IM0501', 'IM0502'],
  },
  IM05: {
    id: 'IM05',
    name: 'Southeast Asian Rainforests',
    realm: 'IM',
    subrealm: 'IM-INDOCHINA',
    primaryType: 'nature',
    secondaryType: 'flow',
    center: [105.0, 15.0],
    features: ['mekong_delta', 'tropical_forests', 'rice_paddies'],
    capital: false,
    ecoregionIds: ['IM0101', 'IM0102', 'IM0103'],
  },
  IM06: {
    id: 'IM06',
    name: 'Borneo & Sumatra Tropical',
    realm: 'IM',
    subrealm: 'IM-MALESIA',
    primaryType: 'flow',
    secondaryType: 'nature',
    center: [115.0, 0.0],
    features: ['orangutans', 'peat_forests', 'biodiversity_hotspot'],
    capital: false,
    ecoregionIds: ['IM0101', 'IM0102', 'IM0103'],
  },
  IM07: {
    id: 'IM07',
    name: 'Indonesian Volcanic Arc',
    realm: 'IM',
    subrealm: 'IM-MALESIA',
    primaryType: 'blaze',
    secondaryType: 'flow',
    center: [110.0, -7.0],
    features: ['ring_of_fire', 'volcanic_islands', 'krakatoa'],
    capital: true, // Blaze capital
    ecoregionIds: ['IM0104', 'IM0105', 'AA0101'],
  },
  IM08: {
    id: 'IM08',
    name: 'Philippine Archipelago',
    realm: 'IM',
    subrealm: 'IM-MALESIA',
    primaryType: 'flow',
    secondaryType: 'grid',
    center: [122.0, 12.0],
    features: ['island_biodiversity', 'coral_triangle', 'typhoon_belt'],
    capital: false,
    ecoregionIds: ['IM0201', 'IM0202', 'IM0203'],
  },
  IM09: {
    id: 'IM09',
    name: 'South China Karst',
    realm: 'IM',
    subrealm: 'IM-CHINA',
    primaryType: 'nature',
    secondaryType: 'oracle',
    center: [110.0, 25.0],
    features: ['karst_mountains', 'guilin_peaks', 'cave_systems'],
    capital: false,
    ecoregionIds: ['IM0501', 'IM0502'],
  },
  IM10: {
    id: 'IM10',
    name: 'Pearl River Delta',
    realm: 'IM',
    subrealm: 'IM-CHINA',
    primaryType: 'grid',
    secondaryType: 'flow',
    center: [114.0, 23.0],
    features: ['tech_megacity', 'manufacturing', 'urban_density'],
    capital: false,
    ecoregionIds: ['IM0503'],
  },

  // ===== AUSTRALASIAN (AU) - 7 Bioregions =====
  AU01: {
    id: 'AU01',
    name: 'Queensland Tropical Rainforests',
    realm: 'AU',
    subrealm: 'AU-AUSTRALIA',
    primaryType: 'nature',
    secondaryType: 'flow',
    center: [146.0, -17.0],
    features: ['oldest_rainforest', 'reef_meets_forest', 'cassowaries'],
    capital: false,
    ecoregionIds: ['AA0101', 'AA0102'],
  },
  AU02: {
    id: 'AU02',
    name: 'Australian Outback',
    realm: 'AU',
    subrealm: 'AU-AUSTRALIA',
    primaryType: 'blaze',
    secondaryType: 'social',
    center: [134.0, -25.0],
    features: ['red_center', 'uluru', 'desert_adapted'],
    capital: false,
    ecoregionIds: ['AA1301', 'AA1302', 'AA1303'],
  },
  AU03: {
    id: 'AU03',
    name: 'Great Barrier Reef Marine',
    realm: 'AU',
    subrealm: 'AU-AUSTRALIA',
    primaryType: 'flow',
    secondaryType: 'social',
    center: [147.0, -18.0],
    features: ['largest_reef', 'coral_biodiversity', 'marine_sanctuary'],
    capital: true, // Flow capital
    ecoregionIds: ['AA0201'],
  },
  AU04: {
    id: 'AU04',
    name: 'New Zealand Temperate',
    realm: 'AU',
    subrealm: 'AU-NEWZEALAND',
    primaryType: 'nature',
    secondaryType: 'terra',
    center: [172.0, -43.0],
    features: ['fiordland', 'flightless_birds', 'geothermal'],
    capital: false,
    ecoregionIds: ['AA0401', 'AA0402', 'AA0403'],
  },
  AU05: {
    id: 'AU05',
    name: 'Tasmanian Wilderness',
    realm: 'AU',
    subrealm: 'AU-AUSTRALIA',
    primaryType: 'nature',
    secondaryType: 'flow',
    center: [146.0, -42.0],
    features: ['temperate_rainforest', 'devils', 'wilderness'],
    capital: false,
    ecoregionIds: ['AA0404', 'AA0405'],
  },
  AU06: {
    id: 'AU06',
    name: 'Papua New Guinea Highlands',
    realm: 'AU',
    subrealm: 'AU-NEWGUINEA',
    primaryType: 'nature',
    secondaryType: 'terra',
    center: [145.0, -6.0],
    features: ['birds_of_paradise', 'tribal_cultures', 'mountain_forests'],
    capital: false,
    ecoregionIds: ['AA0105', 'AA0106'],
  },
  AU07: {
    id: 'AU07',
    name: 'Australian Southwestern',
    realm: 'AU',
    subrealm: 'AU-AUSTRALIA',
    primaryType: 'blaze',
    secondaryType: 'nature',
    center: [116.0, -32.0],
    features: ['mediterranean_climate', 'wildflowers', 'isolated_evolution'],
    capital: false,
    ecoregionIds: ['AA1201', 'AA1202'],
  },

  // ===== OCEANIAN (OC) - 3 Bioregions =====
  OC01: {
    id: 'OC01',
    name: 'Polynesian Islands',
    realm: 'OC',
    subrealm: 'OC-POLYNESIA',
    primaryType: 'flow',
    secondaryType: 'social',
    center: [-175.0, -15.0],
    features: ['volcanic_islands', 'coral_atolls', 'navigation_culture'],
    capital: false,
    ecoregionIds: ['OC0101', 'OC0102', 'OC0103'],
  },
  OC02: {
    id: 'OC02',
    name: 'Micronesian Islands',
    realm: 'OC',
    subrealm: 'OC-MICRONESIA',
    primaryType: 'flow',
    secondaryType: 'grid',
    center: [150.0, 10.0],
    features: ['coral_islands', 'wwii_wrecks', 'marine_diversity'],
    capital: false,
    ecoregionIds: ['OC0201', 'OC0202'],
  },
  OC03: {
    id: 'OC03',
    name: 'Melanesian Islands',
    realm: 'OC',
    subrealm: 'OC-MELANESIA',
    primaryType: 'nature',
    secondaryType: 'flow',
    center: [160.0, -8.0],
    features: ['volcanic_arcs', 'cultural_diversity', 'coral_reefs'],
    capital: false,
    ecoregionIds: ['OC0301', 'OC0302', 'OC0303'],
  },
};

// ============================================
// TYPE CAPITALS - DYNAMIC (NOT HARDCODED)
// ============================================
// NOTE: Type capitals are determined dynamically by which territory
// of that type has the most staked SPIRIT. The hardcoded values below
// are FALLBACK defaults only, used when no stakes exist yet.
// The actual capital is determined at runtime by the staking service.

export const TYPE_CAPITALS_DEFAULT = {
  nature: 'NT01',    // Amazon Basin (default)
  flow: 'AU03',    // Great Barrier Reef (default)
  blaze: 'IM07',     // Indonesian Volcanic Arc (default)
  grid: 'NT09', // Catatumbo Lightning (default)
  oracle: 'PA11',  // Tibetan Plateau (default)
  terra: 'IM01', // Himalayan (default)
  social: 'NT10',   // Galapagos (default)
};

// DEPRECATED: Use TYPE_CAPITALS_DEFAULT instead
// Kept for backwards compatibility
export const TYPE_CAPITALS = TYPE_CAPITALS_DEFAULT;

// ============================================
// CHAMPION PROGRESSION (Simplified: 3 tiers)
// ============================================

export const CHAMPION_LEVELS = {
  TERRITORY_CHAMPION: {
    id: 'territory_champion',
    name: 'Territory Champion',
    requirement: '1+ territories claimed',
    bonus: 0,
    badge: null,
  },
  BIOREGION_GUARDIAN: {
    id: 'bioregion_guardian',
    name: 'Bioregion Guardian',
    requirement: '3+ territories in same bioregion',
    bonus: 15,  // +15% bonus for spirits bound in this bioregion
    badge: 'guardian',
  },
  REALM_SOVEREIGN: {
    id: 'realm_sovereign',
    name: 'Realm Sovereign',
    requirement: '3+ bioregions in same realm',
    bonus: 30,  // +30% bonus for spirits bound in this realm
    badge: 'sovereign',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getBioregionById(id) {
  return BIOREGIONS[id];
}

export function getBioregionsByRealm(realmCode) {
  return Object.values(BIOREGIONS).filter(b => b.realm === realmCode);
}

export function getBioregionsBySubrealm(subrealmCode) {
  return Object.values(BIOREGIONS).filter(b => b.subrealm === subrealmCode);
}

export function getBioregionsByType(type) {
  return Object.values(BIOREGIONS).filter(
    b => b.primaryType === type || b.secondaryType === type
  );
}

export function getTypeCapital(type) {
  const bioregionId = TYPE_CAPITALS[type];
  return bioregionId ? BIOREGIONS[bioregionId] : null;
}

export function getTypeAffinity(bioregionId, cardType) {
  const bioregion = BIOREGIONS[bioregionId];
  if (!bioregion) return { match: 'none', bonus: 0 };

  if (bioregion.primaryType === cardType) {
    return {
      match: 'primary',
      bonus: bioregion.capital ? 25 : 20,
      label: bioregion.capital ? 'Capital' : 'Primary',
    };
  }
  if (bioregion.secondaryType === cardType) {
    return { match: 'secondary', bonus: 10, label: 'Secondary' };
  }

  // Check if opposing (simplified)
  const opposingTypes = {
    blaze: 'flow',
    flow: 'blaze',
    nature: 'blaze',
    grid: 'nature',
  };
  if (opposingTypes[cardType] === bioregion.primaryType) {
    return { match: 'opposing', bonus: -10, label: 'Opposing' };
  }

  return { match: 'social', bonus: 0, label: 'Social' };
}

/**
 * Calculate champion level based on territory holdings
 * Simplified 3-tier system: Territory → Bioregion → Realm
 * @param {Array} territories - Array of territory objects with bioregion field
 * @returns {Object} Champion level info
 */
export function calculateChampionLevel(territories) {
  if (!territories || territories.length === 0) {
    return null;
  }

  // Count territories per bioregion
  const bioregionCounts = {};
  territories.forEach(t => {
    if (t.bioregion) {
      bioregionCounts[t.bioregion] = (bioregionCounts[t.bioregion] || 0) + 1;
    }
  });

  // Count bioregions per realm
  const realmBioregions = {};
  Object.keys(bioregionCounts).forEach(bioId => {
    const bio = BIOREGIONS[bioId];
    if (bio) {
      if (!realmBioregions[bio.realm]) {
        realmBioregions[bio.realm] = new Set();
      }
      realmBioregions[bio.realm].add(bioId);
    }
  });

  // Check for Realm Sovereign (3+ bioregions in same realm)
  for (const realm of Object.keys(realmBioregions)) {
    if (realmBioregions[realm].size >= 3) {
      return {
        level: CHAMPION_LEVELS.REALM_SOVEREIGN,
        details: { realm, bioregions: realmBioregions[realm].size },
      };
    }
  }

  // Check for Bioregion Guardian (3+ territories in same bioregion)
  for (const [bioId, count] of Object.entries(bioregionCounts)) {
    if (count >= 3) {
      return {
        level: CHAMPION_LEVELS.BIOREGION_GUARDIAN,
        details: { bioregion: bioId, territories: count },
      };
    }
  }

  // Default: Territory Champion
  return {
    level: CHAMPION_LEVELS.TERRITORY_CHAMPION,
    details: { territories: territories.length },
  };
}

// ============================================
// ZOOM LEVEL CONFIGURATION
// ============================================

export const ZOOM_LEVELS = {
  GLOBAL: { level: 1, minZoom: 0, maxZoom: 2.5, layer: 'realms' },
  REALM: { level: 2, minZoom: 2.5, maxZoom: 4, layer: 'subrealms' },
  SUBREALM: { level: 3, minZoom: 4, maxZoom: 6, layer: 'bioregions' },
  BIOREGION: { level: 4, minZoom: 6, maxZoom: 9, layer: 'territories' },
  TERRITORY: { level: 5, minZoom: 9, maxZoom: 22, layer: 'pilgrimage' },
};

export function getZoomLevel(zoom) {
  if (zoom < 2.5) return ZOOM_LEVELS.GLOBAL;
  if (zoom < 4) return ZOOM_LEVELS.REALM;
  if (zoom < 6) return ZOOM_LEVELS.SUBREALM;
  if (zoom < 9) return ZOOM_LEVELS.BIOREGION;
  return ZOOM_LEVELS.TERRITORY;
}
