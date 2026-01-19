'use client';

import { TrailSearchResult, TrailRecommendation } from '@/lib/types';
import TrailFinderResults from '@/components/trail-finder/TrailFinderResults';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Compass, ArrowRight, Lock, Truck, MapPin, Mountain } from 'lucide-react';
import Link from 'next/link';

// Sample data for demonstration
const SAMPLE_RECOMMENDATIONS: TrailRecommendation[] = [
  {
    name: 'Hell\'s Revenge Trail',
    location: 'Moab, Utah',
    source: 'alltrails',
    sourceUrl: 'https://www.alltrails.com/trail/us/utah/hells-revenge',
    difficulty: 4,
    length: '6.5 miles',
    elevationGain: '1,200 ft',
    description: 'One of Moab\'s most famous and challenging trails, featuring steep slickrock climbs, dramatic drop-offs, and stunning views of the La Sal Mountains. This trail tests your vehicle\'s capabilities with near-vertical rock faces.',
    whyRecommended: 'Your lifted Tacoma with lockers and 33" tires is well-suited for this trail. The long-travel suspension will help absorb the impacts on the slickrock, though some sections may require careful line selection.',
    vehicleCompatibility: 'good',
    sceneryType: ['desert', 'canyon'],
    bestSeason: 'Spring (March-May) or Fall (Sept-Nov)',
    permits: 'None required',
    warnings: [
      'Not recommended when wet - slickrock becomes extremely slippery',
      'Several sections have significant exposure to cliff edges',
    ],
  },
  {
    name: 'Fins & Things',
    location: 'Moab, Utah',
    source: 'onx',
    sourceUrl: 'https://www.onxmaps.com/offroad/trails/fins-n-things',
    difficulty: 3,
    length: '9 miles',
    elevationGain: '800 ft',
    description: 'A classic Moab trail featuring unique sandstone fins and moderate slickrock obstacles. Great views of Arches National Park and the surrounding desert landscape. Perfect introduction to Moab\'s famous slickrock.',
    whyRecommended: 'Excellent match for your setup! The moderate difficulty means you\'ll have fun without constantly worrying about damage. Your skid plates will come in handy on a few rocky sections.',
    vehicleCompatibility: 'excellent',
    sceneryType: ['desert', 'canyon'],
    bestSeason: 'Year-round (avoid summer heat)',
    permits: 'None required',
    warnings: ['Some narrow sections - be careful with wider vehicles'],
  },
  {
    name: 'Gemini Bridges Trail',
    location: 'Moab, Utah',
    source: 'gaia',
    sourceUrl: 'https://www.gaiagps.com/map/?layer=GaiaTopoRasterFeet',
    difficulty: 2,
    length: '14 miles',
    elevationGain: '600 ft',
    description: 'A scenic moderate trail leading to two natural rock bridges spanning a 200-foot canyon. The trail follows an old mining road with sandy sections and mild rock obstacles. Great for all skill levels.',
    whyRecommended: 'A perfect warm-up trail or family-friendly option. Your vehicle is more than capable - this trail will let you enjoy the scenery without technical stress.',
    vehicleCompatibility: 'excellent',
    sceneryType: ['desert', 'canyon'],
    bestSeason: 'Year-round',
    permits: 'None required',
    warnings: [],
  },
  {
    name: 'Poison Spider Mesa',
    location: 'Moab, Utah',
    source: 'forum',
    sourceUrl: 'https://www.expeditionportal.com/forum/threads/poison-spider-mesa.12345/',
    difficulty: 4,
    length: '7 miles',
    elevationGain: '1,400 ft',
    description: 'A challenging trail with technical rock crawling sections, steep climbs, and the infamous "Golden Crack" obstacle. Offers incredible views of the Colorado River and Portal area.',
    whyRecommended: 'Your vehicle can handle this, but it will be challenging. The lockers and recovery gear will be essential. Consider running with a spotter vehicle.',
    vehicleCompatibility: 'marginal',
    sceneryType: ['desert', 'canyon', 'mountain'],
    bestSeason: 'Spring or Fall',
    permits: 'None required',
    warnings: [
      'Golden Crack requires precise driving - damage is common',
      'Bring recovery gear - this trail can break parts',
      'Allow 4-6 hours minimum',
    ],
  },
  {
    name: 'Chicken Corners',
    location: 'Moab, Utah',
    source: 'alltrails',
    sourceUrl: 'https://www.alltrails.com/trail/us/utah/chicken-corners',
    difficulty: 2,
    length: '20 miles',
    elevationGain: '400 ft',
    description: 'A scenic drive along dramatic cliff edges overlooking the Colorado River canyon. Named for the "chicken out" points where nervous drivers can turn around. Mostly easy terrain with incredible views.',
    whyRecommended: 'Easy and scenic - perfect for photography stops and enjoying your rig without technical challenges. The views are some of the best in Moab.',
    vehicleCompatibility: 'excellent',
    sceneryType: ['desert', 'canyon'],
    bestSeason: 'Year-round',
    permits: 'None required',
    warnings: ['Significant cliff exposure - not for those afraid of heights'],
  },
  {
    name: 'Metal Masher',
    location: 'Moab, Utah',
    source: 'onx',
    difficulty: 5,
    length: '4 miles',
    elevationGain: '500 ft',
    description: 'An extreme technical trail featuring massive rock obstacles, tight squeezes, and challenging off-camber sections. One of Moab\'s most difficult trails, known for breaking parts.',
    whyRecommended: 'This trail exceeds your vehicle\'s recommended capabilities. While technically possible, the risk of significant damage is high. Consider watching others run it first.',
    vehicleCompatibility: 'not-recommended',
    sceneryType: ['desert'],
    bestSeason: 'Spring or Fall',
    permits: 'None required',
    warnings: [
      'Extreme difficulty - vehicle damage very likely',
      'Minimum 35" tires and lockers required',
      'Do not attempt without experienced spotters',
    ],
  },
];

const SAMPLE_RESULT: TrailSearchResult = {
  query: {
    location: 'Moab, Utah',
    searchRadius: 50,
    difficultyPref: 'moderate',
    tripLength: 'weekend',
    sceneryTypes: ['desert', 'canyon'],
    vehicleInfo: {
      make: 'Toyota',
      model: 'Tacoma',
      year: 2022,
      features: [
        'lift-kit',
        'all-terrain-tires',
        'rear-locker',
        'skid-plates',
        'recovery-boards',
      ],
      suspensionBrand: 'icon',
      suspensionTravel: 'mid-travel',
    },
  },
  recommendations: SAMPLE_RECOMMENDATIONS,
  searchSummary: 'Found 6 trails near Moab, Utah matching your preferences. Your 2022 Toyota Tacoma with ICON mid-travel suspension is well-equipped for most trails in this area. We\'ve included a mix of moderate and challenging options, with difficulty ratings tailored to your vehicle\'s capabilities.',
  vehicleCapabilityScore: 4,
};

export default function SampleTrailFinderPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Hero Section */}
      <div className="mb-8">
        <Badge variant="secondary" className="mb-4">
          Sample Results
        </Badge>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Compass className="h-8 w-8 text-trail-green" />
          Trail Finder Preview
        </h1>
        <p className="text-muted-foreground">
          See what Trail Finder can do! This example shows results for a 2022 Toyota Tacoma
          searching for trails near Moab, Utah.
        </p>
      </div>

      {/* Sample Vehicle Info */}
      <Card className="mb-6 bg-gradient-to-br from-trail-tan/20 to-trail-cream/20">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-trail-brown" />
              <span className="font-medium">Sample Vehicle:</span>
              <span>2022 Toyota Tacoma</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Moab, Utah</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mountain className="h-4 w-4" />
              <span>Weekend Trip</span>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs">Lift Kit</Badge>
            <Badge variant="outline" className="text-xs">AT Tires</Badge>
            <Badge variant="outline" className="text-xs">Rear Locker</Badge>
            <Badge variant="outline" className="text-xs">Skid Plates</Badge>
            <Badge variant="outline" className="text-xs">ICON Suspension</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Results Display */}
      <TrailFinderResults result={SAMPLE_RESULT} />

      {/* CTA Section */}
      <Card className="mt-8 bg-gradient-to-br from-trail-green/10 to-trail-brown/10 border-trail-green/20">
        <CardContent className="py-8 text-center">
          <Lock className="h-12 w-12 mx-auto text-trail-green mb-4" />
          <h2 className="text-xl font-bold mb-2">Want to Find Trails for Your Rig?</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Sign up to search for trails tailored to your specific vehicle, location,
            and preferences. Get personalized recommendations powered by AI.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-trail-green hover:bg-trail-green/90">
              <Link href="/auth/signup">
                Create Free Account
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/auth/signin">
                Sign In
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
