const express = require('express');
const cors = require('cors');
const path = require('path');
const {
    MongoClient,
    ObjectId
} = require('mongodb');

const app = express();

const PORT =
    process.env.PORT || 3000;

const API_ROOT =
    'https://afterschoolclub-backend.onrender.com';


const allowedOrigins = [

    'https://eliaspaul04.github.io',

    'http://localhost:3000',

    'http://127.0.0.1:3000',

    'http://localhost:5500',

    'http://127.0.0.1:5500'

];


// ==================== MIDDLEWARE ====================

app.use(
    express.json({
        limit: '1mb'
    })
);


app.use(
    cors({

        origin(origin, callback) {

            if (
                !origin ||
                allowedOrigins.includes(origin)
            ) {

                return callback(
                    null,
                    true
                );

            }


            return callback(
                new Error(
                    'Origin is not allowed by CORS.'
                )
            );

        }

    })
);


app.use(
    (req, res, next) => {

        console.log(
            `[${new Date().toISOString()}] ` +
            `${req.method} ${req.url}`
        );

        next();

    }
);


// Serve the existing product images.

app.use(
    '/images',
    express.static(
        path.join(
            __dirname,
            'public',
            'Images'
        ),
        {
            maxAge: '1d',
            fallthrough: false
        }
    )
);


// ==================== DATABASE ====================

let db = null;

let mongoClient = null;


const uri =
    process.env.MONGODB_URI;


async function connectToMongoDB() {

    if (!uri) {

        console.error(
            'MONGODB_URI environment variable is not set.'
        );

        return;

    }


    try {

        mongoClient =
            new MongoClient(
                uri,
                {

                    family: 4,

                    serverSelectionTimeoutMS: 30000

                }
            );


        await mongoClient.connect();


        db =
            mongoClient.db(
                'webstore'
            );


        console.log(
            'Connected to MongoDB'
        );

    }

    catch (error) {

        db = null;

        console.error(
            'Error connecting to MongoDB:',
            error
        );

    }

}


function databaseReady(res) {

    if (db) {
        return true;
    }


    res.status(503).json({

        error:
            'Database is not connected. Please try again shortly.'

    });


    return false;

}


function escapeRegex(value) {

    return String(value).replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
    );

}


function isPlainObject(value) {

    return (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
    );

}


// ==================== ROUTES ====================


// Root API route.

app.get(
    '/',
    (req, res) => {

        res.json({

            message:
                'After School Club API is running',

            status:
                'online',

            api:
                API_ROOT

        });

    }
);


// Health endpoint.

app.get(
    '/health',
    (req, res) => {

        res.status(
            db
                ? 200
                : 503
        ).json({

            status:
                db
                    ? 'healthy'
                    : 'degraded',

            database:
                db
                    ? 'connected'
                    : 'disconnected'

        });

    }
);


// ==================== SEARCH ====================

app.get(
    '/search',
    async (req, res) => {

        try {

            if (
                !databaseReady(res)
            ) {
                return;
            }


            const searchQuery =
                String(
                    req.query.q || ''
                ).trim();


            if (!searchQuery) {

                return res
                    .status(400)
                    .json({

                        error:
                            'Search query is empty.'

                    });

            }


            const safeQuery =
                escapeRegex(
                    searchQuery
                );


            const results =
                await db
                    .collection('products')
                    .find({

                        $or: [

                            {
                                title: {
                                    $regex:
                                        safeQuery,
                                    $options:
                                        'i'
                                }
                            },

                            {
                                description: {
                                    $regex:
                                        safeQuery,
                                    $options:
                                        'i'
                                }
                            },

                            {
                                location: {
                                    $regex:
                                        safeQuery,
                                    $options:
                                        'i'
                                }
                            }

                        ]

                    })
                    .toArray();


            res.json(
                results
            );

        }

        catch (error) {

            console.error(
                'Error during search:',
                error
            );


            res
                .status(500)
                .json({

                    error:
                        'An error occurred during search.'

                });

        }

    }
);


// ==================== PRODUCTS ====================

app.get(
    '/products',
    async (req, res) => {

        try {

            if (
                !databaseReady(res)
            ) {
                return;
            }


            const results =
                await db
                    .collection('products')
                    .find({})
                    .toArray();


            res.json(
                results
            );

        }

        catch (error) {

            console.error(
                'Error fetching products:',
                error
            );


            res
                .status(500)
                .json({

                    error:
                        'Failed to fetch products.'

                });

        }

    }
);


// ==================== ORDERS ====================

app.post(
    '/orders',
    async (req, res) => {

        try {

            if (
                !databaseReady(res)
            ) {
                return;
            }


            const orderData =
                req.body;


            if (
                !isPlainObject(orderData)
            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            'Invalid order data.'

                    });

            }


            if (

                !orderData.firstName ||

                !orderData.lastName ||

                !orderData.address ||

                !orderData.city

            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            'Please provide the required customer information.'

                    });

            }


            if (

                !Array.isArray(
                    orderData.items
                ) ||

                orderData.items.length === 0

            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            'An order must contain at least one item.'

                    });

            }


            const result =
                await db
                    .collection('orders')
                    .insertOne({

                        ...orderData,

                        createdAt:
                            orderData.createdAt ||
                            new Date().toISOString()

                    });


            res
                .status(201)
                .json({

                    msg:
                        'Order successfully added',

                    orderId:
                        result.insertedId

                });

        }

        catch (error) {

            console.error(
                'Error creating order:',
                error
            );


            res
                .status(500)
                .json({

                    error:
                        'Failed to create order.'

                });

        }

    }
);


// ==================== PRODUCT UPDATE ====================

app.put(
    '/products/:id',
    async (req, res) => {

        try {

            if (
                !databaseReady(res)
            ) {
                return;
            }


            const productId =
                req.params.id;


            const updateData =
                req.body;


            if (!productId) {

                return res
                    .status(400)
                    .json({

                        error:
                            'Product ID is missing.'

                    });

            }


            if (
                !ObjectId.isValid(
                    productId
                )
            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            'Invalid product ID format.'

                    });

            }


            if (

                !isPlainObject(
                    updateData
                ) ||

                Object.keys(
                    updateData
                ).length === 0

            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            'Invalid update data.'

                    });

            }


            const safeUpdate =
                {
                    ...updateData
                };


            delete safeUpdate._id;


            const result =
                await db
                    .collection('products')
                    .updateOne(

                        {
                            _id:
                                new ObjectId(
                                    productId
                                )
                        },

                        {
                            $set:
                                safeUpdate
                        }

                    );


            if (
                result.matchedCount === 0
            ) {

                return res
                    .status(404)
                    .json({

                        error:
                            'Product not found.'

                    });

            }


            res.json({

                message:
                    'Product updated successfully.',

                modified:
                    result.modifiedCount > 0

            });

        }

        catch (error) {

            console.error(
                'Error updating product:',
                error
            );


            res
                .status(500)
                .json({

                    error:
                        'Failed to update product.'

                });

        }

    }
);


// ==================== 404 ====================

app.use(
    (req, res) => {

        res
            .status(404)
            .json({

                error:
                    'Route not found.'

            });

    }
);


// ==================== ERROR HANDLING ====================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(
            'Unhandled server error:',
            error
        );


        if (
            error.message ===
            'Origin is not allowed by CORS.'
        ) {

            return res
                .status(403)
                .json({

                    error:
                        'Request origin is not allowed.'

                });

        }


        if (res.headersSent) {

            return next(
                error
            );

        }


        res
            .status(500)
            .json({

                error:
                    'Unexpected server error.'

            });

    }
);


// ==================== STARTUP ====================

async function startServer() {

    await connectToMongoDB();


    app.listen(
        PORT,
        () => {

            console.log(
                `Server running on port ${PORT}`
            );

            console.log(
                `API root: ${API_ROOT}`
            );

            console.log(
                `Images: ${API_ROOT}/images/<filename>`
            );

        }
    );

}


startServer();


// ==================== SHUTDOWN ====================

process.on(
    'SIGINT',
    async () => {

        console.log(
            'Shutting down server...'
        );


        if (mongoClient) {

            await mongoClient.close();

        }


        process.exit(0);

    }
);


process.on(
    'SIGTERM',
    async () => {

        console.log(
            'Shutting down server...'
        );


        if (mongoClient) {

            await mongoClient.close();

        }


        process.exit(0);

    }
);