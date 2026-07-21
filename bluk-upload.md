# Implement Production-Ready Excel & CSV Import Feature

## Goal

Implement a **production-ready file import system** that supports both **Excel (.xlsx, .xls)** and **CSV (.csv)** files.

The system should parse the uploaded file, validate it, and convert it into a JavaScript array. **For now, do NOT insert anything into the database.** After successful parsing, simply log the parsed array to the console and return it in the API response.

The architecture should be clean, modular, scalable, and easy to extend later for database import.

---

# Requirements

## Supported File Types

Accept only:

* `.csv`
* `.xlsx`
* `.xls`

Reject every other file type.

Maximum file size:

* 10 MB

---

# Backend Stack

Use:

* TypeScript
* Express
* Multer (memory storage)
* xlsx
* csv-parse (or fast-csv)
* Zod
* Clean Architecture
* Async/Await
* Proper Error Handling

---

```

No business logic inside routes.

Routes should only call controllers.

Controllers call services.

Services call parser + validator.

---

# Upload Endpoint

Create

POST  api

Accept multipart/form-data

Field name:

file

---

# Upload Middleware

Use Multer Memory Storage.

Never save files on disk.

Reject files larger than 10MB.

Reject unsupported MIME types.

Return meaningful error messages.

---

# File Detection

Automatically detect whether the uploaded file is:

* CSV
* XLSX
* XLS

based on MIME type and extension.

---

# CSV Parsing

Use a proper CSV parser.

Return an array like:

```ts
[
  {
    name: "Habib",
    email: "habib@gmail.com",
    phone: "017...",
    appointment date ,
    stage,
    platform,
    etc
  }
]
```

---

# Excel Parsing

Use xlsx.

Read the first worksheet.

Convert it into JSON using:

sheet_to_json()

Return the exact same structure as CSV.

---

# Validation

Create reusable validation.

Check:

* File exists
* File type valid
* File not empty
* Headers exist
* Rows exist

If validation fails, return proper HTTP status.

Example:

400 Bad Request

```json
{
  "success": false,
  "message": "CSV contains no data."
}
```

---

# Normalize Headers

Trim spaces.

Convert headers to lowercase.

Convert spaces into underscores.

Example:

Employee Name

↓

employee_name

Phone Number

↓

phone_number

This makes imports consistent.

---

# Parser Output

The parser should always return:

```ts
{
  success: true,
  totalRows: 50,
  data: [...]
}
```

---

# Logging

After successful parsing:

Console log:

```ts
console.log(parsedData);
```

Also log:

```text
File Name

File Type

Total Rows

Parsing Time

```

Example:

```text
File:

employees.xlsx

Type:

xlsx

Rows:

250

Time:

43ms
```

---

# API Response

Return:

```json
{
  "success": true,
  "message": "File parsed successfully.",
  "totalRows": 250,
  "data": [...]
}
```

For now, DO NOT insert anything into the database.

---

# Error Handling

Handle:

* Missing file
* Invalid file type
* Empty file
* Invalid CSV
* Corrupted Excel
* Parse failure
* Unexpected exceptions

Never expose stack traces.

---

# Code Quality

Use:

* TypeScript interfaces
* Reusable functions
* Async/await
* SOLID principles
* Dependency separation
* Clean naming
* No duplicated code

---

# Future Ready

Design the parser so that later we can easily add:

* Database import
* Zod row validation
* Duplicate detection
* Preview screen
* Field mapping
* Import progress
* Background jobs
* Batch insertion
* Transactions
* Import history
* Error report download

without rewriting the parser.

---

# Performance

The parser should be efficient enough for files containing several thousand rows.

Avoid unnecessary memory allocations.

Use streaming for CSV parsing where practical.

Keep Excel parsing isolated in its own module.

---

# Final Deliverable

Generate complete production-ready code including:

* Upload middleware
* Routes
* Controller
* Service
* CSV parser
* Excel parser
* Header normalizer
* Validation utilities
* Shared TypeScript types
* Error handling
* Express route registration

The implementation should compile without TypeScript errors and be structured so it can later be extended to import data into the database with minimal changes.
