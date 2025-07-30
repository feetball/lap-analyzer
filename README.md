# Lap Analyzer Pro

A comprehensive race car data analysis tool built with Next.js that processes CSV files from data loggers, performs automatic lap detection using GPS coordinates, and provides detailed telemetry analysis.

## Features

### Core Functionality
- **CSV File Upload**: Drag-and-drop CSV files from your data logger
- **Automatic Circuit Detection**: Recognizes major US racing circuits from GPS coordinates
- **Lap Detection**: Automatically detects laps using start/finish line crossings
- **Interactive Data Analysis**: Select and visualize multiple telemetry channels
- **Circuit Visualization**: Satellite view with lap overlays using OpenStreetMap
- **Lap Comparison**: Compare multiple laps with synchronized data views
- **Best Theoretical Lap**: Calculate optimal lap times from sector data

### Advanced Features
- **Session Management**: Save and load previous sessions for comparison
- **Database Storage**: Local SQLite database for offline access
- **Real-time Charts**: Interactive telemetry charts with Chart.js
- **GPS Mapping**: Leaflet-based mapping with circuit overlays
- **Multi-channel Analysis**: Support for speed, RPM, throttle, brake pressure, and more

### Supported Circuits
- Road America
- Laguna Seca
- Circuit of the Americas
- Watkins Glen
- Sebring International Raceway
- Daytona International Speedway
- VIRginia International Raceway

## Technology Stack

- **Frontend**: Next.js 14+, React, TypeScript
- **Styling**: Tailwind CSS with custom gradient themes
- **Charts**: Chart.js with react-chartjs-2
- **Mapping**: Leaflet with react-leaflet
- **Database**: SQLite with better-sqlite3
- **CSV Processing**: Papa Parse
- **Icons**: Lucide React

## Deployment

### Railway (Recommended)

The easiest way to deploy this application:

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

**Quick Deploy Steps:**
1. Fork this repository
2. Sign up for [Railway](https://railway.app)
3. Connect your GitHub repository
4. Deploy automatically with included `Dockerfile`

See [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) for detailed instructions.

### Other Deployment Options

- **Vercel**: `vercel --prod`
- **Docker**: `docker build -t lap-analyzer . && docker run -p 3000:3000 lap-analyzer`
- **Traditional VPS**: Follow the local setup instructions

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd lap-analyzer
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## CSV File Format

Your CSV file should include the following columns:

### Required Columns
- **Latitude**: GPS latitude (lat, latitude, etc.)
- **Longitude**: GPS longitude (lon, lng, longitude, etc.)

### Optional Columns
- **Speed**: Vehicle speed
- **RPM**: Engine RPM
- **Throttle**: Throttle position (0-100%)
- **Brake**: Brake pressure
- **Gear**: Current gear
- **Engine Temp**: Engine temperature
- **Oil Pressure**: Oil pressure
- **Fuel Level**: Fuel level
- **Time/Timestamp**: Time data for accurate lap timing

## Usage Guide

### 1. Upload Data
- Navigate to the "Data Upload" tab
- Drag and drop your CSV file or click to browse
- The system will validate GPS coordinates and parse the data

### 2. Analyze Data
- Switch to the "Analysis" tab
- Select telemetry channels to display
- Choose specific laps or view the entire session
- View lap times and performance metrics

### 3. View Circuit Map
- Go to the "Circuit Map" tab
- See your GPS track overlaid on satellite imagery
- Select individual laps to highlight
- View start/finish line markers for known circuits

### 4. Compare Laps
- Use the "Lap Compare" tab
- Select multiple laps for comparison
- Choose metrics to compare (speed, RPM, etc.)
- View performance deltas and statistics

### 5. Save Sessions
- Click "Save Session" to store data locally
- Access saved sessions in the "Sessions" tab
- Load previous sessions for multi-session analysis

## Development

### Project Structure
```
src/
├── app/                 # Next.js app router pages
│   ├── api/            # API routes for database operations
│   └── page.tsx        # Main application page
├── components/         # React components
│   ├── FileUpload.tsx  # CSV file upload component
│   ├── DataAnalysis.tsx # Telemetry analysis and charts
│   ├── CircuitMap.tsx  # GPS mapping component
│   ├── LapComparison.tsx # Lap comparison tools
│   └── SessionManager.tsx # Session storage management
└── utils/              # Utility functions
    ├── raceAnalysis.ts # Lap detection and circuit identification
    └── database.ts     # SQLite database operations
```

### Key Components

- **FileUpload**: Handles CSV file parsing and validation
- **DataAnalysis**: Main telemetry visualization with interactive charts
- **CircuitMap**: GPS track visualization with Leaflet maps
- **LapComparison**: Side-by-side lap analysis and comparison
- **SessionManager**: Database operations for saving/loading sessions

### Database Schema

The application uses SQLite with the following tables:

- **sessions**: Stores session metadata and raw CSV data
- **laps**: Stores individual lap data and metrics

## Inspiration

This project draws inspiration from professional race analysis tools:
- **MoTeC i2**: Professional telemetry analysis software
- **AiM Race Studio**: Data logging and analysis platform
- **Circuit Tools**: Track mapping and analysis tools

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, feature requests, or bug reports, please open an issue on GitHub.

## Roadmap

- [ ] Real-time data streaming support
- [ ] Advanced sector timing analysis
- [ ] Weather data integration
- [ ] Car setup comparison tools
- [ ] Export capabilities (PDF reports, etc.)
- [ ] Mobile responsive design
- [ ] Cloud database support
- [ ] Team collaboration features
