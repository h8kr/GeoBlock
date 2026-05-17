export interface AppEntry {
  id: string;
  packageName: string;
  appName: string;
}

export const COMMON_APPS: AppEntry[] = [
  {id: '1', packageName: 'com.instagram.android', appName: 'Instagram'},
  {id: '2', packageName: 'com.zhiliaoapp.musically', appName: 'TikTok'},
  {id: '3', packageName: 'com.twitter.android', appName: 'X (Twitter)'},
  {id: '4', packageName: 'com.snapchat.android', appName: 'Snapchat'},
  {id: '5', packageName: 'com.facebook.katana', appName: 'Facebook'},
  {id: '6', packageName: 'com.google.android.youtube', appName: 'YouTube'},
  {id: '7', packageName: 'com.reddit.frontpage', appName: 'Reddit'},
  {id: '8', packageName: 'com.discord', appName: 'Discord'},
  {id: '9', packageName: 'com.netflix.mediaclient', appName: 'Netflix'},
  {id: '10', packageName: 'com.amazon.avod.thirdpartyclient', appName: 'Prime Video'},
];
