# 🔧 Lap Detection Consistency Fix

## ✅ Issue Resolved: LapComparison Using Different Lap Detection

### **Problem:**
The `LapComparison` component was using hardcoded lap detection that **always split data into exactly 3 laps**, while other components (CircuitMap, DataAnalysis) were using the proper GPS-based `detectLaps()` function that could detect **variable numbers of laps** (often 6+ laps).

### **Root Cause:**
```typescript
// OLD - LapComparison.tsx (WRONG)
const lapSize = Math.floor(data.length / 3);
for (let i = 0; i < 3; i++) {
  // Always created exactly 3 laps regardless of actual data
}

// CORRECT - CircuitMap.tsx and others
detectedLaps = detectLaps(data, circuitObj || null, latKey, lonKey, timeKey);
// Could detect 6+ laps based on GPS start/finish line crossings
```

### **Fix Applied:**
1. **Import Proper Detection**: Added `detectCircuit`, `detectLaps`, and `KNOWN_CIRCUITS` imports
2. **GPS-Based Detection**: LapComparison now uses the same detection logic as other components
3. **Fallback Handling**: Still falls back to 3-lap chunking if GPS detection fails
4. **Automatic Selection**: Auto-selects first 2 laps when lap data changes

### **Updated Logic:**
```typescript
// NEW - LapComparison.tsx (CORRECT)
if (latKey && lonKey) {
  // Use proper GPS-based lap detection
  const gpsData = data.map(row => ({ lat: row[latKey], lon: row[lonKey] }));
  const detectedCircuitName = detectCircuit(gpsData);
  const circuitObj = detectedCircuitName ? KNOWN_CIRCUITS[detectedCircuitName] : null;
  
  detectedLaps = detectLaps(data, circuitObj || null, latKey, lonKey, timeKey);
}

// Fallback: chunking if no GPS/circuit detected
if (detectedLaps.length === 0) {
  // Split into 3 chunks as before
}
```

### **Expected Results:**
- ✅ **Consistent Lap Count**: All components now show the same number of laps
- ✅ **GPS-Based Detection**: Uses start/finish line crossings for known circuits
- ✅ **Accurate Lap Times**: Calculated from actual timestamps when available
- ✅ **Auto-Selection**: Automatically selects first 2 laps for comparison
- ✅ **Circuit Recognition**: Displays detected circuit name

### **Testing Instructions:**
1. **Upload GPS telemetry data**
2. **Check Circuit Map**: Note the number of laps detected
3. **Switch to Lap Comparison**: Should show the **same number of laps**
4. **Verify Auto-Selection**: First 2 laps should be pre-selected
5. **Compare Lap Times**: Should use actual timestamps, not random values

### **Benefits:**
- **Unified Experience**: All tabs now use consistent lap detection
- **More Accurate**: GPS-based detection is more precise than time-based chunking
- **Professional Feel**: Matches behavior of racing telemetry software
- **Extensible**: Easy to add new circuits to the detection database

This fix ensures that users see consistent lap data across all analysis views, making the application more reliable and professional.
