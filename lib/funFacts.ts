export const FUN_FACTS = [
  // App & Creator Facts
  'Fun fact: This entire app was built by a single student balancing app development and crazy exam prep!',
  'What started as a simple school project is now growing every single day.',
  'Over 100+ awesome people have already joined this community!',
  'You can scan your food and let our AI instantly generate your workouts.',
  'We are constantly adding new workout quests and outfit videos just for you.',
  'Good things take time... thanks for your patience while our server grabs a coffee!',
  'Fun fact: The creator of this app debugs code by night and studies human anatomy by day!',
  "This app isn't even on the Play Store yet, but our community is already 100+ strong thanks to word of mouth.",
  'Did you know? Many of the features you see were built based on direct suggestions from our earliest users.',
  'Every time you scan a meal or generate a workout, our AI works behind the scenes to calculate the perfect plan for you.',
  'Fun fact: The developer drank an unreasonable amount of coffee just to format the workout and outfit videos you are about to watch.',
  'Building an app and building a physique have one major thing in common: consistency is everything.',
  'We are constantly tweaking the code to make sure your quests and workouts run flawlessly.',
  'Did you know? Getting this app to run perfectly takes balancing heavy API documentation with massive textbook reading.',
  // Mind-Blowing Tech Facts
  'Tech fact: The smartphone in your hand is millions of times more powerful than the computers NASA used to send humans to the moon in 1969.',
  'Did you know? The first computer mouse was actually made out of wood.',
  "Tech fact: Over 90% of the world's currency doesn't exist in physical cash—it only exists on computer servers.",
  'Did you know? The first 1GB hard drive was the size of a refrigerator and weighed over 500 pounds.',
  'Tech fact: There are over 700 different programming languages in the world, but this app was built purely on late nights and caffeine.',
  'Did you know? The concept of Wi-Fi was actually co-invented by a Hollywood actress, Hedy Lamarr.',
  'Tech fact: Every day, humans produce about 2.5 quintillion bytes of data. That\'s enough to fill 10 million Blu-ray discs daily!',
];

/** Fisher-Yates shuffle — returns a new shuffled copy */
export function shuffleFacts(): string[] {
  const arr = [...FUN_FACTS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
