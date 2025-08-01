# Lap Detection in Race Car Data Analyzer

## 🏁 How Lap Detection Works

The app uses a sophisticated **GPS-based lap detection system** with multiple fallback methods to automatically identify laps from telemetry data.

## 📍 Detection Process Flow

### 1. **Circuit Detection**
```typescript
// Step 1: Analyze GPS data to identify the racing circuit
const gpsData = data.map(row => ({ lat: row[latKey], lon: row[lonKey] }));
const detectedCircuitName = detectCircuit(gpsData);
```

**How it works:**
- Calculates the **center point** of all GPS coordinates
- Compares against **known US racing circuits** database
- Finds closest match within **5km radius**
- Returns circuit name or `null` if no match

**Known Circuits Database:**
- Road America
- Laguna Seca  
- Circuit of the Americas (COTA)
- Watkins Glen
- Sebring International Raceway
- Daytona International Speedway
- VIRginia International Raceway

### 2. **Start/Finish Line Detection**
```typescript
// Step 2: Use circuit's known start/finish line for lap detection
const circuitObj = detectedCircuitName ? KNOWN_CIRCUITS[detectedCircuitName] : null;
detectedLaps = detectLaps(data, circuitObj, latKey, lonKey, timeKey);
```

**Method A: Known Circuit** (Most Accurate)
- Uses **pre-defined start/finish line coordinates**
- Checks when GPS track crosses the start/finish line
- Calculates **distance from point to line** using advanced geometry
- Requires at least **30 data points** (≈30 seconds) for valid lap

**Method B: Custom Start/Finish** (User-Defined)
- User can **click on map** to set custom start/finish line
- Same crossing detection algorithm applies
- Useful for unknown tracks or practice sessions

### 3. **Fallback Method**
```typescript
// Step 3: If GPS/circuit detection fails, use data chunking
if (detectedLaps.length === 0) {
  const lapSize = Math.floor(data.length / 3);
  // Split data into 3 equal chunks
}
```

**When used:**
- No GPS data available
- Unrecognized circuit
- GPS data quality too poor

**How it works:**
- Divides total data into **3 equal time periods**
- Assumes each chunk represents one lap
- Less accurate but ensures app functionality

## 🧮 Mathematical Algorithms

### **Distance Calculation (Haversine Formula)**
```typescript
function calculateDistance(lat1, lon1, lat2, lon2): number {
  const R = 6371000; // Earth's radius in meters
  // Haversine formula for accurate GPS distance
}
```

### **Point-to-Line Distance**
```typescript
function isPointNearLine(point, lineStart, lineEnd, threshold = 10m): boolean {
  // Converts GPS to meters
  // Calculates perpendicular distance from point to line
  // Returns true if within 10-meter threshold
}
```

## 📊 Lap Data Calculation

Each detected lap includes:

```typescript
interface LapData {
  lapNumber: number;      // Sequential lap number
  startIndex: number;     // Start position in data array
  endIndex: number;       // End position in data array
  lapTime: number;        // Calculated lap time (seconds)
  maxSpeed: number;       // Maximum speed during lap
  avgSpeed: number;       // Average speed during lap
  data: any[];           // Raw telemetry data for this lap
}
```

**Metrics Calculated:**
- **Lap Time**: Difference between start and end timestamps
- **Max Speed**: Highest speed value in lap data
- **Average Speed**: Mean speed across all lap data points
- **Speed Data**: Searches for columns named: `speed`, `Speed`, `velocity`, `Velocity`

## 🎯 Accuracy & Validation

### **Quality Checks:**
- ✅ **Minimum lap length**: 30 data points (prevents false positives)
- ✅ **GPS coordinate validation**: Lat/Lon within valid ranges (-90/90, -180/180)
- ✅ **Distance threshold**: 10-meter tolerance for start/finish line crossing
- ✅ **Circuit proximity**: 5km radius for circuit matching

### **Data Requirements:**
- **Required**: Latitude and longitude columns
- **Optional**: Time column for accurate lap timing
- **Optional**: Speed column for performance metrics
- **Format**: CSV with numeric GPS coordinates

## 🔧 Integration Points

### **In CircuitMap Component:**
1. **Auto-detection** runs when new data is loaded
2. **Lap paths** are created with unique colors for each lap
3. **Visual representation** shows GPS track with lap segments
4. **Interactive selection** allows comparing specific laps

### **User Experience:**
- **Automatic**: No user intervention required for known circuits
- **Manual override**: Users can set custom start/finish lines
- **Visual feedback**: Detected circuit name displayed
- **Lap comparison**: Up to 2 laps can be selected for analysis

## 🚀 Advanced Features

- **Sector Analysis**: Framework for future sector time analysis
- **Best Theoretical Lap**: Calculates potential best lap time
- **Multiple Circuit Support**: Easily extensible for new tracks
- **Custom Tracks**: User-defined start/finish lines for any location

This sophisticated system ensures accurate lap detection for professional race analysis while maintaining usability for various data sources and track configurations.
