// lib/trail-finder-prompts.ts

import {
  VehicleInfo,
  VehicleFeature,
  SuspensionBrand,
  SuspensionTravelType,
  TrailSearchInput,
  SceneryType,
} from './types';

/**
 * Calculate a vehicle capability score based on features and setup
 * Returns a score from 1-5 where:
 * 1 = Stock/minimal capability
 * 2 = Lightly modified
 * 3 = Moderately capable
 * 4 = Well-equipped
 * 5 = Highly capable/expedition-ready
 */
export function calculateVehicleCapabilityScore(vehicleInfo?: VehicleInfo | null): number {
  if (!vehicleInfo) return 2; // Assume basic capability if no info

  let score = 1; // Start at base

  // Suspension setup contributes significantly
  if (vehicleInfo.suspensionTravel) {
    switch (vehicleInfo.suspensionTravel) {
      case 'race-long-travel':
        score += 2;
        break;
      case 'long-travel':
        score += 1.5;
        break;
      case 'mid-travel':
        score += 1;
        break;
      case 'oem-plus':
        score += 0.5;
        break;
    }
  }

  // Premium suspension brands add capability
  if (vehicleInfo.suspensionBrand) {
    const premiumBrands = [
      'king', 'fox', 'icon', 'camburg-king', 'camburg-fox', 'total-chaos-king',
      'total-chaos-fox', 'dirt-king-king', 'dirt-king-fox', 'kibbetech-king',
      'kibbetech-fox', 'baja-kits-king', 'baja-kits-fox'
    ];
    if (premiumBrands.includes(vehicleInfo.suspensionBrand)) {
      score += 0.5;
    }
  }

  // Features add capability
  const featurePoints: Record<VehicleFeature, number> = {
    'lift-kit': 0.3,
    'all-terrain-tires': 0.2,
    'mud-terrain-tires': 0.3,
    'locking-differentials': 0.5,
    'front-locker': 0.3,
    'rear-locker': 0.3,
    'limited-slip-diff': 0.2,
    'winch': 0.3,
    'skid-plates': 0.2,
    'rock-sliders': 0.2,
    'roof-rack': 0.1,
    'recovery-boards': 0.2,
    'air-compressor': 0.2,
    'snorkel': 0.2,
    'upgraded-suspension': 0.3,
    'steel-bumpers': 0.2,
    'light-bar': 0.1,
  };

  for (const feature of vehicleInfo.features) {
    score += featurePoints[feature] || 0;
  }

  // Cap at 5
  return Math.min(5, Math.round(score * 10) / 10);
}

/**
 * Format vehicle features for display/prompt
 */
function formatFeatures(features: VehicleFeature[]): string {
  const featureLabels: Record<VehicleFeature, string> = {
    'lift-kit': 'Lift Kit',
    'all-terrain-tires': 'All-Terrain Tires',
    'mud-terrain-tires': 'Mud-Terrain Tires',
    'locking-differentials': 'Locking Differentials',
    'front-locker': 'Front Locker',
    'rear-locker': 'Rear Locker',
    'limited-slip-diff': 'Limited Slip Differential',
    'winch': 'Winch',
    'skid-plates': 'Skid Plates',
    'rock-sliders': 'Rock Sliders',
    'roof-rack': 'Roof Rack',
    'recovery-boards': 'Recovery Boards',
    'air-compressor': 'Air Compressor',
    'snorkel': 'Snorkel',
    'upgraded-suspension': 'Upgraded Suspension',
    'steel-bumpers': 'Steel Bumpers',
    'light-bar': 'Light Bar',
  };

  return features.map((f) => featureLabels[f] || f).join(', ');
}

/**
 * Format suspension brand for display
 */
function formatSuspensionBrand(brand: SuspensionBrand): string {
  const brandLabels: Record<SuspensionBrand, string> = {
    'stock': 'Stock/OEM',
    'icon': 'ICON Vehicle Dynamics',
    'fox': 'FOX',
    'king': 'King Shocks',
    'bilstein': 'Bilstein',
    'ome': 'Old Man Emu',
    'dobinsons': 'Dobinsons',
    'eibach': 'Eibach',
    'camburg': 'Camburg Engineering',
    'camburg-king': 'Camburg w/ King Shocks',
    'camburg-fox': 'Camburg w/ FOX',
    'camburg-complete': 'Camburg Complete Kit',
    'dirt-king': 'Dirt King Fabrication',
    'dirt-king-king': 'Dirt King w/ King Shocks',
    'dirt-king-fox': 'Dirt King w/ FOX',
    'total-chaos': 'Total Chaos Fabrication',
    'total-chaos-king': 'Total Chaos w/ King Shocks',
    'total-chaos-fox': 'Total Chaos w/ FOX',
    'rclt': 'RCLT (Race Car Long Travel)',
    'rclt-king': 'RCLT w/ King Shocks',
    'rclt-fox': 'RCLT w/ FOX',
    'kibbetech': 'Kibbetech',
    'kibbetech-king': 'Kibbetech w/ King Shocks',
    'kibbetech-fox': 'Kibbetech w/ FOX',
    'baja-kits': 'Baja Kits',
    'baja-kits-king': 'Baja Kits w/ King Shocks',
    'baja-kits-fox': 'Baja Kits w/ FOX',
    'deaver': 'Deaver Spring',
    'deaver-king': 'Deaver w/ King Shocks',
    'deaver-fox': 'Deaver w/ FOX',
    'other': 'Aftermarket',
  };
  return brandLabels[brand] || brand;
}

/**
 * Format suspension travel type for display
 */
function formatSuspensionTravel(travel: SuspensionTravelType): string {
  const travelLabels: Record<SuspensionTravelType, string> = {
    'stock': 'Stock',
    'oem-plus': 'OEM+ (upgraded shocks/springs)',
    'mid-travel': 'Mid Travel (10-12")',
    'long-travel': 'Long Travel (12-16")',
    'race-long-travel': 'Race Long Travel (16"+)',
  };
  return travelLabels[travel] || travel;
}

/**
 * Format scenery types for display
 */
function formatSceneryTypes(types: SceneryType[]): string {
  const labels: Record<SceneryType, string> = {
    'desert': 'Desert',
    'forest': 'Forest',
    'mountain': 'Mountain',
    'coastal': 'Coastal',
    'canyon': 'Canyon',
    'prairie': 'Prairie/Grassland',
    'alpine': 'Alpine',
    'wetland': 'Wetland/Marsh',
  };
  return types.map((t) => labels[t] || t).join(', ');
}

/**
 * Build the trail finder search prompt
 */
export function buildTrailFinderPrompt(input: TrailSearchInput): string {
  const capabilityScore = calculateVehicleCapabilityScore(input.vehicleInfo);

  let prompt = `You are an expert overland and off-road trail finder assistant. Your task is to search for and recommend trails near a specified location that match the user's vehicle capabilities and preferences.

IMPORTANT: You must search the web for real trails from sources like:
- AllTrails (alltrails.com)
- OnX Offroad (onxmaps.com/offroad)
- Gaia GPS (gaiagps.com)
- Overland forums (expeditionportal.com, thenewx.org, etc.)
- Trail review sites and local 4x4 club websites

Your response must be ONLY valid JSON with no additional text, markdown formatting, or explanation outside the JSON structure.

--- SEARCH PARAMETERS ---
Location: ${input.location}
Search Radius: ${input.searchRadius || 50} miles`;

  if (input.difficultyPref && input.difficultyPref !== 'any') {
    prompt += `\nDifficulty Preference: ${input.difficultyPref}`;
  }

  if (input.tripLength) {
    const tripLabels = {
      'day-trip': 'Day Trip (single day)',
      'weekend': 'Weekend Trip (2-3 days)',
      'multi-day': 'Multi-Day Expedition (4+ days)',
    };
    prompt += `\nTrip Length: ${tripLabels[input.tripLength]}`;
  }

  if (input.sceneryTypes && input.sceneryTypes.length > 0) {
    prompt += `\nPreferred Scenery: ${formatSceneryTypes(input.sceneryTypes)}`;
  }

  prompt += `\n\n--- VEHICLE INFORMATION ---`;

  if (input.vehicleInfo) {
    prompt += `\nMake: ${input.vehicleInfo.make}`;
    prompt += `\nModel: ${input.vehicleInfo.model}`;
    if (input.vehicleInfo.year) {
      prompt += `\nYear: ${input.vehicleInfo.year}`;
    }
    if (input.vehicleInfo.suspensionBrand && input.vehicleInfo.suspensionBrand !== 'stock') {
      prompt += `\nSuspension: ${formatSuspensionBrand(input.vehicleInfo.suspensionBrand)}`;
    }
    if (input.vehicleInfo.suspensionTravel) {
      prompt += `\nSuspension Travel: ${formatSuspensionTravel(input.vehicleInfo.suspensionTravel)}`;
    }
    if (input.vehicleInfo.features.length > 0) {
      prompt += `\nModifications: ${formatFeatures(input.vehicleInfo.features)}`;
    }
  } else {
    prompt += `\nNo specific vehicle provided - assume a stock 4WD SUV or truck`;
  }

  prompt += `\nVehicle Capability Score: ${capabilityScore}/5`;

  prompt += `

--- CAPABILITY SCORE GUIDE ---
1 = Stock vehicle, minimal modifications (easy trails only)
2 = Lightly modified (easy to moderate trails)
3 = Moderately capable (moderate to difficult trails)
4 = Well-equipped (difficult trails, some technical)
5 = Highly capable/expedition-ready (all trail types)

--- INSTRUCTIONS ---
1. Search for off-road trails near "${input.location}" using web search
2. Find 5-8 trails that match the user's preferences and vehicle capabilities
3. For each trail, assess whether it's appropriate for the user's vehicle
4. Prioritize trails from reputable sources (AllTrails, OnX, Gaia)
5. Include a mix of difficulty levels appropriate for the vehicle
6. Provide specific source URLs when available

--- RESPONSE FORMAT ---
Return a JSON object with this exact structure:
{
  "recommendations": [
    {
      "name": "<trail name>",
      "location": "<specific location/area>",
      "source": "<alltrails|onx|gaia|forum|other>",
      "sourceUrl": "<direct URL to the trail page if available>",
      "difficulty": <1-5 rating>,
      "length": "<trail length, e.g., '12 miles'>",
      "elevationGain": "<elevation gain, e.g., '2,500 ft'>",
      "description": "<2-3 sentence description of the trail>",
      "whyRecommended": "<1-2 sentences explaining why this trail suits their vehicle>",
      "vehicleCompatibility": "<excellent|good|marginal|not-recommended>",
      "sceneryType": [<array of scenery types: desert, forest, mountain, coastal, canyon, prairie, alpine, wetland>],
      "bestSeason": "<recommended season(s) to visit>",
      "permits": "<permit requirements if any, or 'None required'>",
      "warnings": [<array of any warnings or considerations>]
    }
  ],
  "searchSummary": "<2-3 sentence summary of the search results and recommendations>",
  "vehicleCapabilityScore": ${capabilityScore}
}

--- VEHICLE COMPATIBILITY RATINGS ---
- "excellent": Trail is well within vehicle's capabilities
- "good": Vehicle can handle it with reasonable driving skill
- "marginal": At the edge of vehicle's capabilities, proceed with caution
- "not-recommended": Trail exceeds vehicle's safe capabilities

--- DIFFICULTY SCALE ---
1 = Easy: Graded dirt/gravel roads, any high-clearance vehicle
2 = Moderate: Some rough sections, 4WD recommended
3 = Difficult: Requires 4WD, expect obstacles
4 = Very Difficult: Technical terrain, modified vehicle recommended
5 = Extreme: Expert-level, significant vehicle damage risk

Search the web NOW and find real trails. Do not make up fictional trails.`;

  return prompt;
}

/**
 * Build search queries for web search
 */
export function buildSearchQueries(input: TrailSearchInput): string[] {
  const queries: string[] = [];
  const location = input.location;

  // Base queries for major trail sources
  queries.push(`AllTrails off-road trails near ${location}`);
  queries.push(`OnX Offroad trails ${location}`);
  queries.push(`Gaia GPS 4x4 trails ${location}`);

  // Add scenery-specific queries
  if (input.sceneryTypes && input.sceneryTypes.length > 0) {
    const scenery = input.sceneryTypes[0];
    queries.push(`${scenery} off-road trails ${location}`);
  }

  // Add difficulty-specific queries
  if (input.difficultyPref && input.difficultyPref !== 'any') {
    queries.push(`${input.difficultyPref} 4x4 trails ${location}`);
  }

  // Add overland forum queries
  queries.push(`overlanding trails ${location} expedition portal`);

  return queries;
}
