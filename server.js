const express = require('express');
const cors = require('cors');
const path = require('path');
const MongoClient = require('mongodb').MongoClient;
const { ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

app.use(cors({
    origin: 'https://eliaspaul04.github.io'
}));

app.use('/images', express.static(path.join(__dirname, 'public', 'Images')));

// Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// MongoDB
let db;

const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error('MONGODB_URI environment variable is not set.');
}

const client = new MongoClient(uri, {
    family: 4,
    serverSelectionTimeoutMS: 30000
});

client.connect()
    .then(() => {
        db = client.db('webstore');
        console.log('Connected to MongoDB');
    })
    .catch(err => {
        console.error('Error connecting to MongoDB:', err);
    });

// Search products
app.get('/search', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const searchQuery = req.query.q;

        if (!searchQuery || searchQuery.trim() === '') {
            return res.status(400).json({
                error: 'Search query is empty.'
            });
        }

        const results = await db.collection('products')
            .find({
                title: {
                    $regex: searchQuery,
                    $options: 'i'
                }
            })
            .toArray();

        res.json(results);

    } catch (error) {
        console.error('Error during search:', error);
        res.status(500).json({
            error: 'An error occurred during search.'
        });
    }
});

// Get products
app.get('/products', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({
                error: 'Database not connected'
            });
        }

        const results = await db.collection('products')
            .find({})
            .toArray();

        res.json(results);

    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            error: 'Failed to fetch products'
        });
    }
});

// Submit order
app.post('/orders', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({
                error: 'Database not connected'
            });
        }

        const orderData = req.body;

        const result = await db.collection('orders')
            .insertOne(orderData);

        res.status(201).json({
            msg: 'Order successfully added',
            orderId: result.insertedId
        });

    } catch (error) {
        console.error('Error creating order:', error);

        res.status(500).json({
            error: 'Failed to create order'
        });
    }
});

// Update product inventory
app.put('/products/:id', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({
                error: 'Database not connected'
            });
        }

        const productId = req.params.id;
        const updateData = req.body;

        if (!productId) {
            return res.status(400).json({
                error: 'Product ID is missing'
            });
        }

        if (!ObjectId.isValid(productId)) {
            return res.status(400).json({
                error: 'Invalid product ID format'
            });
        }

        if (!updateData || typeof updateData !== 'object') {
            return res.status(400).json({
                error: 'Invalid update data'
            });
        }

        const result = await db.collection('products').updateOne(
            {
                _id: new ObjectId(productId)
            },
            {
                $set: updateData
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                error: 'Product not found'
            });
        }

        res.json({
            message: 'Product updated successfully'
        });

    } catch (error) {
        console.error('Error updating product:', error);

        res.status(500).json({
            error: 'Failed to update product'
        });
    }
});

// Root API route
app.get('/', (req, res) => {
    res.json({
        message: 'After School Club API is running'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});