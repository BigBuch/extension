const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Import routes
const homeRoutes = require('./routes/index');

// Middleware для обробки JSON та URL-encoded даних
app.use(express.json()); // Для обробки JSON-даних
app.use(express.urlencoded({ extended: true })); // Для обробки даних із форм

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Use routes
app.use('/', homeRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
