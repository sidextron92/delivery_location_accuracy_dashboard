# Delivery Location Accuracy Analysis Tool

A web-based application to analyze and visualize delivery location accuracy for retail orders.

## Features

- **Interactive Data Upload**: Upload your orders and darkstores data via CSV or JSON files
- **User Selection**: Click on any user in the left table to view all their orders
- **Map Visualization**:
  - Blue markers show order delivery locations
  - Red markers show darkstore locations
  - Click on any marker to see detailed information
- **Order Details**: Bottom table shows all orders for the selected user
- **Search Functionality**: Search by User ID or Order ID
- **Automatic Darkstore Matching**: Darkstores are automatically matched by DS ID and displayed on the map

## File Format Requirements

### Orders Data File
Your orders file should contain the following columns:
- `userId` - Unique identifier for the customer
- `orderId` - Unique identifier for the order
- `orderDate` - Date of the order
- `latLong` - Coordinates in format "latitude,longitude" (e.g., "28.6139,77.2090")
- `dsId` - Darkstore ID from which the order was fulfilled

Example CSV:
```csv
userId,orderId,orderDate,latLong,dsId
user001,order101,2024-01-15,28.6139,77.2090,ds01
user002,order102,2024-01-16,19.0760,72.8777,ds02
```

### Darkstores Data File
Your darkstores file should contain:
- `dsId` - Darkstore identifier (must match dsId in orders)
- `latLong` - Coordinates in format "latitude,longitude"
- `name` (optional) - Name of the darkstore

Example CSV:
```csv
dsId,name,latLong
ds01,Delhi Central,28.6129,77.2295
ds02,Mumbai West,19.0760,72.8777
```

## How to Use

1. Open `index.html` in your web browser
2. Upload your orders data file using the "Upload Orders Data" button
3. Upload your darkstores data file using the "Upload Darkstores Data" button
4. Click on any user row in the left table to visualize their orders
5. Click on map markers to see detailed information
6. Use the search box to filter users/orders

## Sample Data

Sample data files are provided:
- `sample_orders.csv` - Example orders data
- `sample_darkstores.csv` - Example darkstores data

Use these to test the application before uploading your own data.

## Technologies Used

- **Leaflet.js** - Interactive map visualization
- **PapaParse** - CSV file parsing
- **OpenStreetMap** - Map tiles

## Browser Compatibility

This application works best in modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Future Enhancements

Planned features:
- Clustering analysis for delivery locations
- Distance calculations between orders and darkstores
- Location accuracy metrics
- Heat map visualization
- Export analysis reports
