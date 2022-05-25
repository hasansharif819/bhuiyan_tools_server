const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.npa9g.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        await client.connect();
        const serviceCollection = client.db('bhuiyan_tools').collection('service');
        const orderCollection = client.db('bhuiyan_tools').collection('orders');

        //API for all services
        app.get('/purchase', async(req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const service = await cursor.toArray();
            res.send(service);
        });

        //query using id
        app.get('/purchase/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await serviceCollection.findOne(query);
            res.send(result);
        });


        //order collection
        //order now
        app.post('/order', async (req, res) => {
            const order = req.body;
            const query = { service: order.service, client: order.client, quantity: order.quantity };
            const exists = await orderCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, order: exists })
            }
            else {
                const result = await orderCollection.insertOne(order);
                return res.send({ success: true, result });
            }
        })

    }

    finally{

    }

}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Bhuiyan Tools')
})

app.listen(port, () => {
    console.log(`Bhuiyan Tools ${port}`)
})  