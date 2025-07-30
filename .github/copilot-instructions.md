<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Race Car Data Analysis Tool - Development Instructions

## Project Overview
This is a Next.js web application for race car data analysis. It processes CSV files from data loggers, performs automatic lap detection using GPS coordinates, provides circuit visualization, and offers comprehensive data analysis features.

## Project Structure

The application consists of several key components:

### Core Components
- **FileUpload.tsx**: CSV file upload with drag-and-drop support and validation
- **DataAnalysis.tsx**: Main telemetry analysis with interactive Chart.js visualizations
- **CircuitMap.tsx**: GPS track visualization using Leaflet maps with circuit overlays
- **LapComparison.tsx**: Side-by-side lap analysis and performance comparison
- **SessionManager.tsx**: Database operations for saving and loading racing sessions

### Utilities
- **raceAnalysis.ts**: Lap detection algorithms, circuit identification, and GPS calculations
- **database.ts**: SQLite database operations for persistent session storage

### API Routes
- **sessions/route.ts**: REST API for session CRUD operations
- **sessions/[id]/route.ts**: Individual session management endpoints

## Key Features Implemented
- ✅ CSV file upload and parsing with Papa Parse
- ✅ GPS-based automatic lap detection
- ✅ Circuit visualization with satellite view using Leaflet
- ✅ Interactive data analysis charts with Chart.js
- ✅ Lap comparison functionality with performance metrics
- ✅ Best theoretical lap calculation
- ✅ US racing circuits database with known track coordinates
- ✅ Zoom/pan controls for maps
- ✅ Data synchronization across views
- ✅ SQLite database for session storage
- ✅ Session management for offline analysis

## Technical Highlights
- Built with Next.js 14+ App Router and TypeScript
- Responsive UI with Tailwind CSS and custom gradient themes
- Client-side CSV processing for performance
- Dynamic imports to handle SSR issues with maps and charts
- Proper error handling and user feedback
- Professional racing tool inspiration (MoTeC i2, AiM Race Studio)

## Development Notes
- Uses dynamic imports for Leaflet and Chart.js components to avoid SSR issues
- Database operations are handled server-side with proper API routes
- GPS calculations use accurate distance formulas for lap detection
- Circuit detection based on GPS coordinates with known track databases
- Professional UI design inspired by racing telemetry software

## Usage
1. Upload CSV files with GPS and telemetry data
2. Automatically detect laps and racing circuits
3. Analyze individual laps or compare multiple laps
4. View GPS tracks on satellite imagery
5. Save sessions for future analysis and comparison

The application is currently running in development mode and ready for use!