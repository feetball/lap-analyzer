// Script to set test cache data in localStorage
const testData = [
  { 'Lat (degrees)': 40.1234, 'Lon (degrees)': -74.5678, 'Time (Sec)': 0, 'Speed (km/h)': 50 },
  { 'Lat (degrees)': 40.1235, 'Lon (degrees)': -74.5679, 'Time (Sec)': 1, 'Speed (km/h)': 55 },
  { 'Lat (degrees)': 40.1236, 'Lon (degrees)': -74.5680, 'Time (Sec)': 2, 'Speed (km/h)': 60 }
];

console.log('Setting test cache data...');
localStorage.setItem('lap-analyzer-cached-data', JSON.stringify(testData));
localStorage.setItem('lap-analyzer-cached-timestamp', Date.now().toString());
localStorage.setItem('lap-analyzer-cached-file-name', JSON.stringify('test-data.csv'));
console.log('Test cache data set successfully!');
console.log('Cached data length:', testData.length);
