const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.njevu.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const toolCollection = client.db("manufacture_website").collection("tools")
        const reviewCollection = client.db("manufacture_website").collection("comments")
        const orderCollection = client.db("manufacture_website").collection("orders")


        app.get('/tools', async (req, res) => {
            const result = await toolCollection.find().toArray()
            res.send(result)
        })

        app.get('/review', async (req, res) => {
            const result = await reviewCollection.find().toArray()
            res.send(result)
        })

        app.get('/tools/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const laptop = await toolCollection.findOne(query)
            res.send(laptop)
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

    }
    finally {

    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello From my manufacture website')
})

app.listen(port, () => {
    console.log(`this website is running on port ${port}`)
})
