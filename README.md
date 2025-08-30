# RoutineGen - University Schedule Parser

A full-stack MERN application that parses university advising slips (CSV files) and displays course schedules in a visual weekly calendar format.

## Features

- Upload CSV files containing university course schedules
- Parse course information including course codes, times, days, and rooms
- Display courses in a visual weekly calendar grid
- Responsive design that works on desktop and mobile
- Color-coded course blocks for easy identification
- Support for multi-day courses (e.g., TR for Tuesday/Thursday)

## Project Structure

```
RoutineGen/
├── server.js              # Express backend server
├── package.json           # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   ├── FileUpload.js  # File upload component
│   │   ├── RoutineTable.js # Schedule display component
│   │   ├── App.css        # Styling
│   │   └── index.js       # React entry point
│   ├── public/
│   │   └── index.html     # HTML template
│   └── package.json       # Frontend dependencies
└── README.md              # This file
```

## Day Code Mapping

The application uses the following day code mapping:
- `S` = Sunday
- `M` = Monday
- `T` = Tuesday
- `W` = Wednesday
- `R` = Thursday
- `A` = Saturday

## Installation & Setup

### Prerequisites

- Node.js (version 14 or higher)
- npm (Node Package Manager)

### Backend Setup

1. Navigate to the project root directory:
   ```bash
   cd RoutineGen
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Start the backend server:
   ```bash
   npm start
   ```
   
   The backend server will run on `http://localhost:5000`

   For development with auto-restart:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Start the React development server:
   ```bash
   npm start
   ```
   
   The frontend will run on `http://localhost:3000` and automatically open in your browser.

## Usage

1. Make sure both backend and frontend servers are running
2. Open your browser and go to `http://localhost:3000`
3. Click "Choose File" and select your university advising slip CSV file
4. Click "Upload & Process" to parse the file
5. View your weekly schedule in the visual calendar grid

## Expected CSV Format

Your CSV file should contain:
- A row with "Course(s)" header
- Subsequent rows with course data including:
  - Course name/code
  - Time-WeekDay column (e.g., "TR 10:10AM-11:40AM")
  - Room information

Example CSV content:
```csv
Course(s),,,Time-WeekDay,,,Room
ENG7102,,,MW 4:50PM-6:20PM,,,221
ICE109,,,TR 10:10AM-11:40AM,,,AB3-302
MAT102,,,TR 11:50AM-1:20PM,,,AB3-401
```

## API Endpoints

### POST /api/upload
- Accepts multipart form data with a CSV file
- Returns JSON array of parsed course objects
- Each course object contains: courseCode, day, startTime, endTime, room

### GET /api/health
- Health check endpoint
- Returns server status

## Technologies Used

### Backend
- Node.js
- Express.js
- Multer (file upload handling)
- XLSX (CSV/Excel parsing)
- CORS (Cross-Origin Resource Sharing)

### Frontend
- React.js
- Axios (HTTP client)
- CSS Grid/Flexbox for layout
- Responsive design

## Development

### Running in Development Mode

Backend (with auto-restart):
```bash
npm run dev
```

Frontend (with hot reload):
```bash
cd frontend
npm start
```

### Building for Production

Frontend build:
```bash
cd frontend
npm run build
```

## Troubleshooting

1. **Backend server not starting**: Make sure port 5000 is not in use
2. **Frontend can't connect to backend**: Ensure both servers are running and check the proxy setting in frontend/package.json
3. **File upload fails**: Check file format (CSV/Excel) and ensure the file contains the required headers
4. **Schedule not displaying**: Verify the CSV contains valid time formats and day codes

## License

MIT License
