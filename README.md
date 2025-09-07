# RoutineGen - University Schedule Parser

A full-stack MERN application that parses university advising slips (CSV files) and displays course schedules in a visual weekly calendar format.

## Features

- Upload multiple file formats: CSV, Excel (.xlsx/.xls), PDF, and Images (JPG/PNG)
- **Interactive Data Verification**: Review and edit extracted data from PDF/image uploads before generating schedule
- Advanced OCR text extraction from images and PDFs using Tesseract.js
- Parse course information including course codes, times, days, and rooms
- Display courses in a visual weekly calendar grid starting with Sunday
- Intelligent Friday inclusion (only shows Friday if courses are scheduled)
- Responsive design that works on desktop and mobile
- Color-coded course blocks for easy identification
- Support for multi-day courses (e.g., TR for Tuesday/Thursday, MW for Monday/Wednesday)
- Enhanced day code mapping including Friday support (F = Friday)
- **Smart day code grouping** for complex course schedules
- **Real-time data editing** with validation and error correction

## Project Structure

```
RoutineGen/
├── server.js              # Express backend server
├── package.json           # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── App.js              # Main React component with workflow management
│   │   ├── FileUpload.js       # File upload component with multi-format support
│   │   ├── EditableDataTable.js # Interactive data verification component (NEW)
│   │   ├── RoutineTable.js     # Schedule display component
│   │   ├── App.css             # Main styling
│   │   ├── EditableDataTable.css # Data verification styling (NEW)
│   │   └── index.js            # React entry point
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
3. Click "Choose File" and select your university schedule file

### For CSV/Excel Files:
4. Click "Upload & Process" to parse the file
5. View your weekly schedule in the visual calendar grid immediately

### For PDF/Image Files:
4. Click "Upload & Process" to parse the file with OCR
5. **NEW**: Review the extracted data in the interactive verification table
6. Edit any incorrect course codes, times, days, or room information
7. Add new courses or delete unwanted entries as needed
8. Click "Confirm & Generate Schedule" to create your visual calendar

The application automatically detects your file type and provides the appropriate workflow!

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
- Uses OCR (Optical Character Recognition) to extract text with Tesseract.js
- **Interactive verification** allows you to review and correct OCR results
- Works best with clear, high-contrast images
- Recommended: scan documents at 300 DPI or higher for best results
- **NEW**: Editable table interface for data validation before schedule generation

## API Endpoints

### POST /api/upload
- Accepts multipart form data with various file formats:
  - CSV files (.csv) - Direct processing to schedule
  - Excel files (.xlsx, .xls) - Direct processing to schedule  
  - PDF files (.pdf) with automatic text extraction - **Verification workflow**
  - Image files (.jpg, .jpeg, .png) with OCR processing - **Verification workflow**
- Returns JSON array of parsed course objects
- Each course object contains: courseCode, day, startTime, endTime, room
- Automatically detects file type and applies appropriate parsing method
- **NEW**: PDF/Image files trigger interactive data verification step

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
