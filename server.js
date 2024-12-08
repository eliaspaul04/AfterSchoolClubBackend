const express = require('express');
const path = require('path');
const MongoClient = require('mongodb').MongoClient;
const app = express();
const PORT = 3000;

// Middleware for JSON parsing
app.use(express.json());

// Setting CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin,Accept,X-Requested-With,Content-Type,Access-Control-Request-Method,Access-Control-Request-Headers'
    );
    next();
});

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// MongoDB connection
let db;
const uri = 'mongodb+srv://ep04:eliaspaul2004@cluster0.iotzr.mongodb.net/'; 

MongoClient.connect(uri)
    .then(client => {
        db = client.db('webstore'); // Replace 'webstore' with your actual database name
        console.log('Connected to MongoDB');
    })
    .catch(err => {
        console.error('Error connecting to MongoDB:', err.message);
    });

// Middleware for handling collection name in the route
app.param('collectionName', (req, res, next, collectionName) => {
    if (!db) {
        return res.status(500).send('Database not initialized');
    }
    req.collection = db.collection(collectionName);
    next();
});

// API route to fetch products
app.get('/products', (req, res, next) => {
    if (!db) {
        return res.status(500).send('Database not connected');
    }
    db.collection('products')
        .find({})
        .toArray()
        .then(results => res.send(results))
        .catch(err => next(err));
});

app.post('/orders', (req, res, next) => {
    const orderData = req.body;

    // Insert the data into the 'orders' collection
    req.collection = db.collection('orders');
    req.collection.insertOne(orderData, (err, result) => {
        if (err) return next(err); 
        res.status(201).send({ 
            msg: 'Order successfully added', 
            orderId: result.insertedId 
        }); // Respond with success message and order ID
    });
});



app.use((req, res) => {
    res.status(404).send('Page not found');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
