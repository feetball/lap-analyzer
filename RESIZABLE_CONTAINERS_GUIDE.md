# 🎛️ Resizable Container System - Implementation Guide

## ✅ Feature Added: Drag-and-Drop Resizable Containers

### **🎯 What's New:**
Users can now **drag and resize** any chart, map, or container throughout the application by grabbing edges and corners. This provides a **professional, customizable interface** similar to tools like MoTeC i2 and AiM Race Studio.

### **📍 Resizable Components Implemented:**

#### **1. LapComparison Chart**
- **Location**: Lap Comparison tab → Performance Chart
- **Resize Direction**: Both (width & height)
- **Default Size**: 800px × 400px
- **Limits**: 400px-1200px wide, 250px-800px tall
- **Usage**: Drag any edge or corner to resize

#### **2. Circuit Map**
- **Location**: Circuit Map tab → Interactive Map
- **Resize Direction**: Both (width & height) 
- **Default Size**: 800px × mapHeight setting
- **Limits**: 400px-1400px wide, 300px-1000px tall
- **Usage**: Drag edges to resize map viewport

#### **3. Data Analysis Chart**
- **Location**: Data Analysis tab → Telemetry Chart
- **Resize Direction**: Both (width & height)
- **Default Size**: 800px × 400px
- **Limits**: 400px-1400px wide, 250px-800px tall
- **Usage**: Resize to focus on specific data patterns

#### **4. Performance Summary Cards**
- **Location**: Lap Comparison tab → Bottom section
- **Resize Direction**: Vertical only (height)
- **Default Size**: Auto width × 200px tall
- **Limits**: 150px-400px tall
- **Usage**: Drag bottom edge to expand summary view

### **🔧 Technical Implementation:**

#### **ResizableContainer Component**
```typescript
interface ResizableContainerProps {
  defaultWidth?: number;     // Initial width
  defaultHeight?: number;    // Initial height
  minWidth?: number;        // Minimum width limit
  minHeight?: number;       // Minimum height limit
  maxWidth?: number;        // Maximum width limit
  maxHeight?: number;       // Maximum height limit
  resizeDirection?: 'horizontal' | 'vertical' | 'both';
  onResize?: (width: number, height: number) => void;
}
```

#### **Resize Handles**
- **Right Edge**: Horizontal resizing (east-west cursor)
- **Bottom Edge**: Vertical resizing (north-south cursor) 
- **Bottom-Right Corner**: Both directions (diagonal cursor)
- **Visual Feedback**: Handles appear on hover with colored indicators

#### **User Experience Features**
- **Hover Indicators**: Subtle gray handles appear on hover
- **Live Dimensions**: Shows current size during resize
- **Smooth Transitions**: Hover effects with smooth color transitions
- **Visual Cues**: "📏 Drag edges to resize" helper text
- **Memory**: Container sizes persist during the session

### **🎨 Visual Design:**

#### **Resize Handles**
- **Width Handle**: 2px wide invisible area on right edge
- **Height Handle**: 2px tall invisible area on bottom edge
- **Corner Handle**: 4px × 4px area in bottom-right corner
- **Hover Effect**: Blue semi-transparent background (blue-500/20)
- **Active Indicator**: Rounded gray bars that appear on hover

#### **Resize Feedback**
- **Live Dimensions**: Black tooltip showing "W: 800px × H: 400px"
- **Cursor Changes**: Appropriate resize cursors (ew-resize, ns-resize, nw-resize)
- **No Text Selection**: Prevents text selection during resize

### **🚀 Usage Instructions:**

#### **For Users:**
1. **Hover** over any chart, map, or container edge
2. **Look for** the resize cursor (arrows)
3. **Click and drag** to resize in desired direction
4. **Release** when satisfied with new size
5. **Dimensions persist** within the current session

#### **For Developers:**
```tsx
<ResizableContainer
  defaultWidth={800}
  defaultHeight={400}
  minWidth={400}
  maxWidth={1200}
  resizeDirection="both"
  onResize={(width, height) => {
    // Handle size changes
    console.log(`New size: ${width}×${height}`);
  }}
>
  <YourComponent />
</ResizableContainer>
```

### **🎛️ Advanced Features:**

#### **Direction Control**
- **'horizontal'**: Only width resizing
- **'vertical'**: Only height resizing  
- **'both'**: Full 2D resizing (default)

#### **Constraint System**
- **Minimum Sizes**: Prevents containers from becoming too small
- **Maximum Sizes**: Prevents containers from becoming too large
- **Responsive**: Works on all screen sizes

#### **Integration**
- **Chart.js**: Automatically redraws charts when resized
- **Leaflet**: Map viewport updates correctly
- **Performance**: Smooth resizing without lag

### **✨ Benefits:**

#### **User Experience**
- **Customizable Layout**: Users control their workspace
- **Better Analysis**: Larger charts show more detail
- **Professional Feel**: Matches industry-standard tools
- **Intuitive**: Natural drag-and-drop interaction

#### **Accessibility** 
- **Visual Feedback**: Clear hover states and cursors
- **Keyboard Support**: Future enhancement possibility
- **Screen Readers**: Proper ARIA labels can be added
- **Touch Support**: Works on touch devices

This resizable container system transforms the lap analyzer into a **professional-grade application** where users can customize their workspace for optimal data analysis and visualization.
