console.log('🧪 Setting up test cache data...');

// Set test data directly in localStorage
const testData = [
  { Time: 0.0, 'GPS Latitude (°)': 30.132660, 'GPS Longitude (°)': -97.640694, 'Speed (mph)': 45.2, 'Engine Speed (RPM)': 3500 },
  { Time: 0.1, 'GPS Latitude (°)': 30.132661, 'GPS Longitude (°)': -97.640695, 'Speed (mph)': 46.1, 'Engine Speed (RPM)': 3550 },
  { Time: 0.2, 'GPS Latitude (°)': 30.132662, 'GPS Longitude (°)': -97.640696, 'Speed (mph)': 47.0, 'Engine Speed (RPM)': 3600 },
  { Time: 0.3, 'GPS Latitude (°)': 30.132663, 'GPS Longitude (°)': -97.640697, 'Speed (mph)': 47.8, 'Engine Speed (RPM)': 3650 },
  { Time: 0.4, 'GPS Latitude (°)': 30.132664, 'GPS Longitude (°)': -97.640698, 'Speed (mph)': 48.5, 'Engine Speed (RPM)': 3700 }
];

localStorage.setItem('lap-analyzer-cached-data', JSON.stringify(testData));
localStorage.setItem('lap-analyzer-file-name', JSON.stringify('test-cache-data.csv'));
localStorage.setItem('lap-analyzer-timestamp', Date.now().toString());
localStorage.setItem('lap-analyzer-active-tab', JSON.stringify('comparison'));

console.log('✅ Test cache data set!');
console.log('📊 Records:', testData.length);
console.log('📁 Filename: test-cache-data.csv');

// Now reload the page to test
console.log('🔄 Now refresh the page to test auto-loading...');
setTimeout(() => {
  window.location.reload();
}, 2000);
