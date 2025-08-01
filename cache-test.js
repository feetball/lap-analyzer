// Test script to verify localStorage caching
// Run this in browser console

console.log('🧪 Testing localStorage caching...');

// Check current localStorage state
console.log('📦 Current localStorage keys:', Object.keys(localStorage).filter(k => k.includes('lap-analyzer')));

// Function to check cache
function checkCache() {
  const keys = [
    'lap-analyzer-cached-data',
    'lap-analyzer-file-name', 
    'lap-analyzer-timestamp',
    'lap-analyzer-selected-lap',
    'lap-analyzer-selected-laps',
    'lap-analyzer-active-tab'
  ];
  
  keys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      console.log(`✅ ${key}:`, value.length > 100 ? `${value.substring(0, 100)}...` : value);
    } else {
      console.log(`❌ ${key}: not found`);
    }
  });
}

// Function to clear cache
function clearCache() {
  const keys = [
    'lap-analyzer-cached-data',
    'lap-analyzer-file-name', 
    'lap-analyzer-timestamp',
    'lap-analyzer-selected-lap',
    'lap-analyzer-selected-laps',
    'lap-analyzer-active-tab'
  ];
  
  keys.forEach(key => localStorage.removeItem(key));
  console.log('🗑️ Cache cleared');
}

// Function to simulate data save
function simulateDataSave() {
  const testData = [
    {Time: 0, Latitude: 40.7128, Longitude: -74.0060, Speed: 45.2},
    {Time: 0.1, Latitude: 40.7129, Longitude: -74.0061, Speed: 46.1}
  ];
  
  const filename = 'test-data.csv';
  
  localStorage.setItem('lap-analyzer-cached-data', JSON.stringify(testData));
  localStorage.setItem('lap-analyzer-file-name', JSON.stringify(filename));
  localStorage.setItem('lap-analyzer-timestamp', Date.now().toString());
  localStorage.setItem('lap-analyzer-active-tab', JSON.stringify('comparison'));
  
  console.log('💾 Test data saved to cache');
  checkCache();
}

// Run initial check
checkCache();

console.log('🛠️ Available functions:');
console.log('- checkCache() - Check current cache state');
console.log('- clearCache() - Clear all cache');
console.log('- simulateDataSave() - Save test data to cache');
