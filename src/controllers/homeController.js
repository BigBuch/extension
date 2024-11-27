const path = require('path');

// Controller function for the home page
exports.getHomePage = (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/index.html'));
};
