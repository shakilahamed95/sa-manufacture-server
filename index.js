const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const corsConfig = {
    origin: true,
    Credentials: true
}
app.use(cors(corsConfig))
app.options('*', cors(corsConfig))
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.njevu.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}


async function run() {
    try {
        await client.connect();
        const toolCollection = client.db("manufacture_website").collection("tools")
        const reviewCollection = client.db("manufacture_website").collection("comments")
        const orderCollection = client.db("manufacture_website").collection("orders")
        const userCollection = client.db("manufacture_website").collection("users")
        const paymentCollection = client.db("manufacture_website").collection("payments")


        app.get('/tools', async (req, res) => {
            const result = (await toolCollection.find().toArray()).reverse();
            res.send(result)
        })

        app.get('/review', async (req, res) => {
            const result = await reviewCollection.find().toArray()
            res.send(result)
        })

        app.get('/tools/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const tool = await toolCollection.findOne(query)
            res.send(tool)
        })

        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order)
            res.send(result)
        })

        app.put('/tools/:id', async (req, res) => {
            const id = req.params.id;
            const updatedValue = req.body;
            const query = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    quantity: updatedValue.quantity,
                }
            };
            const result = await toolCollection.updateOne(query, updatedDoc, options);
            res.send(result);

        })

        app.get("/orders", async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await orderCollection.find(query).toArray()
            res.send(result)
        })
        app.get('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const quary = { _id: ObjectId(id) }
            const result = await orderCollection.findOne(quary)
            res.send(result)
        })
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        })

        app.get('/user', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        app.put('/user/admin/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };

            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        app.get('/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })
        app.get('/notadmin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isNotAdmin = user.role !== 'admin';
            res.send({ notadmin: isNotAdmin })
        })
        app.delete("/orders/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await orderCollection.deleteOne(query)
            res.send(result)
        })
        app.post('/create-payment-intent', async (req, res) => {
            const service = req.body;
            const price = service.totalMoney;
            const amount = price / 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.json({ clientSecret: paymentIntent.client_secret })
        });
        app.post('/review', verifyJWT, async (req, res) => {
            const comment = req.body;
            const result = await reviewCollection.insertOne(comment)
            res.send(result)
        })
        app.post('/tools', async (req, res) => {
            const tool = req.body;
            const result = await toolCollection.insertOne(tool)
            res.send(result)
        })
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const user = await userCollection.findOne(query)
            res.send(user)
        })
        app.put('/user/updateprofile/:email', async (req, res) => {
            const email = req.params.email;
            const updateduser = req.body
            const filter = { email: email };
            const updateDoc = {
                $set: {
                    education: updateduser.education,
                    location: updateduser.location,
                    phone: updateduser.phone,
                    linkdin: updateduser.linkdin,
                    img: updateduser.img
                }
            };

            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result)
        })
        app.patch('/orders/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) }
            const updateDoc = {
                $set: {
                    paid: true,
                    status: 'Pending',
                    transactionId: payment.transactionId,
                }
            }
            const result = await paymentCollection.insertOne(payment)
            const order = await orderCollection.updateOne(filter, updateDoc)
            res.send(updateDoc)
        })

        app.get('/allorders', async (req, res) => {
            const order = await orderCollection.find().toArray()
            res.send(order)
        })
        app.delete('/tools/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await toolCollection.deleteOne(query)
            res.send(result)
        })

        app.patch('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: 'Shiped',
                }
            }
            const order = await orderCollection.updateOne(filter, updateDoc)
            res.send(updateDoc)
        })

        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await orderCollection.deleteOne(query)
            res.send(result)
        })

    }
    finally {

    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello,Welcome to my manufacture website')
})

app.listen(port, () => {
    console.log(`this website is running on port ${port}`)
})