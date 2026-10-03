export type SeedActivity = { id: string; name: string; category: string; met: number; stepsPerMinute?: number };

// MET values approximated from the Compendium of Physical Activities.
// stepsPerMinute is set for activities done on foot: the steps they produce are already counted
// as a workout, so the resolver removes them from the day's step total before adding step calories.
export const activities: SeedActivity[] = [
  { id: "walking-slow", name: "Walking (slow, ~3 km/h)", category: "Cardio", met: 2.8, stepsPerMinute: 95 },
  { id: "walking-moderate", name: "Walking (moderate, ~5 km/h)", category: "Cardio", met: 3.5, stepsPerMinute: 110 },
  { id: "walking-brisk", name: "Walking (brisk, ~6.5 km/h)", category: "Cardio", met: 5.0, stepsPerMinute: 130 },
  { id: "hiking", name: "Hiking", category: "Cardio", met: 6.0, stepsPerMinute: 105 },
  { id: "running-8", name: "Running (~8 km/h)", category: "Cardio", met: 8.3, stepsPerMinute: 160 },
  { id: "running-10", name: "Running (~10 km/h)", category: "Cardio", met: 9.8, stepsPerMinute: 170 },
  { id: "running-12", name: "Running (~12 km/h)", category: "Cardio", met: 11.8, stepsPerMinute: 180 },
  { id: "cycling-leisure", name: "Cycling (leisure, <16 km/h)", category: "Cardio", met: 4.0 },
  { id: "cycling-moderate", name: "Cycling (moderate, 16-19 km/h)", category: "Cardio", met: 6.8 },
  { id: "cycling-stationary", name: "Stationary bike (moderate)", category: "Cardio", met: 6.8 },
  { id: "elliptical", name: "Elliptical (moderate)", category: "Cardio", met: 5.0 },
  { id: "rowing-machine", name: "Rowing machine (moderate)", category: "Cardio", met: 7.0 },
  { id: "stair-climbing", name: "Stair climbing", category: "Cardio", met: 8.0, stepsPerMinute: 95 },
  { id: "skipping-rope", name: "Skipping rope", category: "Cardio", met: 11.8 },
  { id: "swimming-moderate", name: "Swimming (moderate laps)", category: "Cardio", met: 5.8 },
  { id: "swimming-vigorous", name: "Swimming (vigorous laps)", category: "Cardio", met: 9.8 },
  { id: "dance-fitness", name: "Dance fitness / Zumba", category: "Cardio", met: 6.5 },
  { id: "hiit", name: "HIIT / circuit training", category: "Cardio", met: 8.0 },

  { id: "weights-moderate", name: "Weight training (moderate)", category: "Strength", met: 3.5 },
  { id: "weights-vigorous", name: "Weight training (vigorous)", category: "Strength", met: 6.0 },
  { id: "calisthenics-moderate", name: "Bodyweight exercises (moderate)", category: "Strength", met: 3.8 },
  { id: "calisthenics-vigorous", name: "Bodyweight exercises (vigorous)", category: "Strength", met: 8.0 },

  { id: "yoga-hatha", name: "Yoga (hatha / gentle)", category: "Flexibility", met: 2.5 },
  { id: "yoga-power", name: "Yoga (power / vinyasa)", category: "Flexibility", met: 4.0 },
  { id: "surya-namaskar", name: "Surya namaskar", category: "Flexibility", met: 3.3 },
  { id: "pilates", name: "Pilates", category: "Flexibility", met: 3.0 },
  { id: "stretching", name: "Stretching", category: "Flexibility", met: 2.3 },

  { id: "cricket", name: "Cricket", category: "Sports", met: 4.8 },
  { id: "badminton", name: "Badminton (social)", category: "Sports", met: 5.5 },
  { id: "football", name: "Football (casual)", category: "Sports", met: 7.0 },
  { id: "basketball", name: "Basketball", category: "Sports", met: 6.5 },
  { id: "tennis", name: "Tennis", category: "Sports", met: 7.3 },
  { id: "table-tennis", name: "Table tennis", category: "Sports", met: 4.0 },

  { id: "household-chores", name: "Household chores (cleaning)", category: "Daily life", met: 3.3 },
];
