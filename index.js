const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.npa9g.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//jwt 
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
        const serviceCollection = client.db('bhuiyan_tools').collection('service');
        const orderCollection = client.db('bhuiyan_tools').collection('orders');
        const reviewCollection = client.db('bhuiyan_tools').collection('reviews');
        const profileCollection = client.db('bhuiyan_tools').collection('userProfile');
        const adminCollection = client.db('bhuiyan_tools').collection('adminProfile');
        const userCollection = client.db('bhuiyan_tools').collection('users');

        //API for all services
        app.get('/purchase', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const service = await cursor.toArray();
            res.send(service);
        });

        //query using id
        app.get('/purchase/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
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
        });

        //my orders
        app.get('/order', verifyJWT, async (req, res) => {
            const client = req.query.client;
            // const authorization = req.headers.authorization;
            // console.log('auth headers', authorization)
            const decodedEmail = req.decoded.email;
            if(client === decodedEmail){
                const query = { client: client };
            const myOrders = await orderCollection.find(query).toArray();
            return res.send(myOrders);
            }
            else{
                return res.status(403).send({message: 'forbidden access'})
            }
            
        });

        //delete my order
        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        });

        //manage all order
        app.get('/order', async(req, res) => {
            const orders = await orderCollection.find().toArray();
            res.send(orders)
        })

        //review post
        app.post('/review', async (req, res) => {
            const review = req.body;
            const query = { review: review.review, client: review.client, clientName: review.clientName, rating: review.rating };
            const exists = await reviewCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, order: exists })
            }
            else {
                const result = await reviewCollection.insertOne(review);
                return res.send({ success: true, result });
            }
        });

        //All reviews
        app.get('/review', async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query);
            const review = await cursor.toArray();
            res.send(review);
        });

        //user profile 
        app.post('/user', async (req, res) => {
            const profile = req.body;
            const query = { client: profile.client, clientName: profile.clientName, edu: profile.edu, address: profile.address, age: profile.age, phone: profile.phone, img: profile.img };
            const exists = await profileCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, order: exists })
            }
            else {
                const result = await profileCollection.insertOne(profile);
                return res.send({ success: true, result });
            }
        });

        // API for all userProfile
        // app.get('/user', verifyJWT, async (req, res) => {
        //     const query = {};
        //     const cursor = profileCollection.find(query);
        //     const result = await cursor.toArray();
        //     res.send(result);
        // });

        //query using email

        // app.get('/user', async (req, res) => {
        //     const email = req.query.email;
        //     const query = { email: email };
        //     const cursor = profileCollection.find(query);
        //     const result = await cursor.toArray();
        //     res.send(cursor);
        // });

        //get all users
        app.get('/user', async(req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users)
        })

        //make an admin
        app.put('/user/:adimin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });

            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                  $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);
              }
              else{
                res.status(403).send({message: 'forbidden'});
              }
        
            })
            //checking admin or not
            app.get('/admin/:email', async(req, res) =>{
                const email = req.params.email;
                const user = await userCollection.findOne({email: email});
                const isAdmin = user.role === 'admin';
                res.send({admin: isAdmin})
              })

        //login user user data colect
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
            res.send({result, token});
        })

    }

    finally {

    }

}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Bhuiyan Tools')
})

app.listen(port, () => {
    console.log(`Bhuiyan Tools ${port}`)
})  