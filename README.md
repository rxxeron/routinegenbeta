# RoutineGen - University Schedule Parser

A full-stack MERN application that parses university advising slips and displays course schedules in a visual weekly calendar format using **local parsing only** - no cloud dependencies.

## Features

- Upload multiple file formats: CSV, Excel (.xlsx/.xls), PDF, and Images (JPG/PNG)
- **Local PDF parsing** using pdf-parse library
- **Local OCR** using Tesseract.js for image text extraction
- Parse course information including course codes, times, days, and rooms
- Display courses in a visual weekly calendar grid starting with Sunday
- Intelligent Friday inclusion (only shows Friday if courses are scheduled)
- Responsive design that works on desktop and mobile
- Color-coded course blocks for easy identification
- Support for multi-day courses (e.g., TR for Tuesday/Thursday, MW for Monday/Wednesday)
- Enhanced day code mapping including Friday support (F = Friday)

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
- `F` = Friday
- `A` = Saturday

**Note**: Friday is only displayed in the schedule if there are courses with the 'F' day code.

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

## Supported File Formats

The application supports multiple file formats:

### CSV/Excel Files (.csv, .xlsx, .xls)
Your file should contain:
- A row with "Course(s)" header
- Subsequent rows with course data including:
  - Course name/code
  - Time-WeekDay column (e.g., "TR 10:10AM-11:40AM", "MWF 9:00AM-10:30AM")
  - Room information

Example CSV content:
```csv
Course(s),,,Time-WeekDay,,,Room
ENG7102,,,MW 4:50PM-6:20PM,,,221
ICE109,,,TR 10:10AM-11:40AM,,,AB3-302
MAT102,,,MWF 11:50AM-1:20PM,,,AB3-401
```

### PDF Files (.pdf)
- PDF documents containing course schedules
- Text is automatically extracted and parsed
- Should contain course information in a structured format

### Image Files (.jpg, .jpeg, .png)
- Images of course schedules or advising slips
- Uses OCR (Optical Character Recognition) to extract text
- Works best with clear, high-contrast images
- Recommended: scan documents at 300 DPI or higher for best results

## API Endpoints

### POST /api/upload
- Accepts multipart form data with various file formats:
  - CSV files (.csv)
  - Excel files (.xlsx, .xls)
  - PDF files (.pdf) with automatic text extraction
  - Image files (.jpg, .jpeg, .png) with OCR processing
- Returns JSON array of parsed course objects
- Each course object contains: courseCode, day, startTime, endTime, room
- Automatically detects file type and applies appropriate parsing method

### GET /api/health
- Health check endpoint
- Returns server status

## Technologies Used

### Backend
- Node.js
- Express.js
- Multer (file upload handling)
- XLSX (CSV/Excel parsing)
- PDF-Parse (PDF text extraction)
- Tesseract.js (OCR for images)
- Sharp (image processing)
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
