# Lap Ordering Fix - Testing Guide

## ✅ Fix Applied: Explicit Rendering Order (Including Overlay Mode)

### **Problem Fixed:**
- Lap display order wasn't changing which lap appeared on top
- React/Leaflet wasn't properly re-ordering polylines based on sorting
- **NEW**: Lap ordering stopped working when throttle/brake overlays were enabled

### **Solution Implemented:**
1. **Explicit Separation**: Split laps into background and front lap arrays
2. **Rendering Order**: Background laps render first, front lap renders last
3. **Visual Distinction**: Front lap has thicker line (6px vs 4px) and higher opacity (0.9 vs 0.7)
4. **🔥 OVERLAY MODE FIX**: Applied same ordering logic to colored segments when overlays are active

### **How to Test:**
1. **Upload CSV data** with GPS coordinates
2. **Select 2 laps** for comparison
3. **Open Settings** (gear icon) and look for "Lap Display Order" section
4. **Test WITHOUT overlays**: Click different lap buttons to bring them to front
5. **Test WITH overlays**: 
   - Enable throttle or brake overlay
   - Use lap ordering buttons - should still work!
   - Front lap segments appear thicker and more prominent

### **Expected Behavior:**
- ✅ **Default Order**: All laps render in natural order
- ✅ **Front Lap Selected**: Chosen lap renders on top with thicker line
- ✅ **Visual Feedback**: Legend shows "(Front)" and yellow border  
- ✅ **🎯 OVERLAY MODE**: Front lap ordering works with throttle/brake overlays enabled
- ✅ **Enhanced Visibility**: Front lap segments are 20% thicker and more opaque in overlay mode

### **Overlay Mode Enhancements:**
- **Background segments**: Reduced to 70% opacity
- **Front lap segments**: Full opacity + 20% thicker lines
- **Preserved functionality**: Hover tooltips and data visualization still work
- **Consistent behavior**: Same ordering logic as normal lap view

### **Key Changes Made:**
```tsx
// Split laps into background and front
const backgroundLaps = lapsToRender.filter(lap => frontLap !== lap.lapNumber);
const frontLapData = frontLap ? lapsToRender.find(lap => lap.lapNumber === frontLap) : null;

// Render background laps first, then front lap
<>
  {backgroundLaps.map(lap => <Polyline ... />)}
  {frontLapData && <Polyline weight={6} opacity={0.9} ... />}
</>
```

This ensures proper rendering order in Leaflet's DOM structure.
